// The sideways ellipses used to open the 'remove' menu. To the left of each
// message, generally visible on hover.
MORE_BUTTONS_HOLDER_QUERY =
  '[data-testid="outgoing_group"] [aria-label="Message actions"]';
MORE_BUTTONS_QUERY = '[aria-label="More"]';

// The button used to open the remove confirmation dialog.
REMOVE_BUTTON_QUERY = '[aria-label="Remove message"]';

// The button used to close the 'message removed' post confirmation.
OKAY_BUTTON_QUERY = '[aria-label="Okay"]';

// The button used to get rid of the Could Not Remove Message popup.
COULDNT_REMOVE_QUERY = "._3quh._30yy._2t_._5ixy.layerCancel";

// The button used to confirm the message removal.
REMOVE_CONFIRMATION_QUERY = '[aria-label="Remove"]';

// The holder for all of the messages in the chat.
SCROLLER_QUERY =
  '[role="main"] .buofh1pr.j83agx80.eg9m0zos.ni8dbmo4.cbu4d94t.gok29vw1';

MESSAGES_QUERY = "[aria-label=Messages]";

// The loading animation.
LOADING_QUERY = '[role="main"] [aria-valuetext="Loading..."]';

// The div holding the inbox (used for scrolling).
INBOX_QUERY =
  ".q5bimw55.rpm2j7zs.k7i0oixp.gvuykj2m.j83agx80.cbu4d94t.ni8dbmo4.eg9m0zos.l9j0dhe7.du4w35lb.ofs802cu.pohlnb88.dkue75c7.mb9wzai9.d8ncny3e.buofh1pr.g5gj957u.tgvbjcpo.l56l04vs.r57mb794.kh7kg01d.c3g1iek1.k4xni2cv";

// The button used to keep scrolling up after a search in the messenger chain.
// TODO(theahura): FB Dec 2021 update kills the search in conversation
// feature. These queries are outdated.
LOAD_MORE_QUERY = null;
SEARCH_BAR_QUERY = null;
SEARCH_CANDIDATE_QUERY = null;
HIGHLIGHTED_QUERY = null;
SEARCH_IN_CONVO_QUERY = null;
NEXT_SEARCH_QUERY = null;
PREVIOUS_SEARCH_QUERY = null;

(function() {
  STATUS = {
    CONTINUE: "continue",
    ERROR: "error",
    COMPLETE: "complete"
  };

  // Helper functions ----------------------------------------------------------
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getSiblings(el) {
    // Setup siblings array and get the first sibling
    var siblings = [];
    var sibling = el.parentNode.firstChild;

    // Loop through each sibling and push to the array
    while (sibling) {
      if (sibling.nodeType === 1 && sibling !== el) {
        siblings.push(sibling);
      }
      sibling = sibling.nextSibling;
    }

    return siblings;
  }

  // Removal functions ---------------------------------------------------------
  async function unsendAllVisibleMessages(lastRun) {
    // Click on all ... buttons that let you select 'more' for all messages you
    // sent.
    const more_buttons_holders = document.querySelectorAll(
      MORE_BUTTONS_HOLDER_QUERY
    );
    console.log("Found hidden menu holders: ", more_buttons_holders);
    [...more_buttons_holders].map(el => {
      el.click();
    });

    let more_buttons = [
      ...document.querySelectorAll(MORE_BUTTONS_QUERY)
    ].filter(el => {
      return (
        getSiblings(el.parentNode.parentNode.parentNode).length > 1 &&
        el.getAttribute("data-clickcount") < 5
      );
    });

    const more_button_count = more_buttons.length;

    while (more_buttons.length > 0) {
      console.log("Clicking more buttons: ", more_buttons);
      [...more_buttons].map(el => {
        el.click();
        const prevClickCount = el.getAttribute("data-clickcount");
        el.setAttribute(
          "data-clickcount",
          prevClickCount ? prevClickCount + 1 : 1
        );
      });
      await sleep(2000);

      // Click on all of the 'remove' popups that appear.
      let remove_buttons = document.querySelectorAll(REMOVE_BUTTON_QUERY);
      while (remove_buttons.length > 0) {
        console.log("Clicking remove buttons: ", remove_buttons);
        [...remove_buttons].map(el => {
          el.click();
        });

        // Click on all of the 'confirm remove' buttons.
        await sleep(5000);
        const unsend_buttons = document.querySelectorAll(
          REMOVE_CONFIRMATION_QUERY
        );
        console.log("Unsending: ", unsend_buttons);
        for (let unsend_button of unsend_buttons) {
          unsend_button.click();
        }
        await sleep(5000);
        remove_buttons = document.querySelectorAll(REMOVE_BUTTON_QUERY);
      }
      more_buttons = [...document.querySelectorAll(MORE_BUTTONS_QUERY)].filter(
        el => {
          return (
            getSiblings(el.parentNode.parentNode.parentNode).length > 1 &&
            el.getAttribute("data-clickcount") < 5
          );
        }
      );
    }

    // TODO(theahura): Figure out if the code for rate limiting is still relevant.
    //
    // for (let remove_button of remove_buttons) {
    //   // Sometimes a remove fails for inexplicable reasons, likely rate limting.
    //   // To handle this, we loop until we confirm the message is deleted.
    //   while (true) {
    //     remove_button.click();
    //     await sleep(2000);
    //     // Each one of those remove buttons will pull up a modal for confirmation.
    //     // Click the modal too.
    //     console.log("Unsending: ", unsend_button);
    //     unsend_button.click();
    //     await sleep(2000);

    //     // There might be a post confirmation message letting you know about the
    //     // removal. Get rid of it.
    //     const maybe_ok_button = document.querySelector(OKAY_BUTTON_QUERY);
    //     if (maybe_ok_button) maybe_ok_button.click();
    //     await sleep(2000);

    //     let couldntremove = document.querySelector(COULDNT_REMOVE_QUERY);
    //     if (couldntremove) {
    //       await 3000000;
    //     } else {
    //       break;
    //     }
    //   }
    // }

    // If this is the last run before the runner cycle finishes, dont keep
    // scrolling up.
    if (lastRun) {
      return { status: STATUS.CONTINUE, data: 500 };
    }

    // Cleaned out all the couldnt remove buttons. Now, check to see if we need
    // to hit the 'Load More' button or if we need to scroll up.
    const maybeLoaders = document.querySelectorAll(LOAD_MORE_QUERY);
    const scroller_ = document.querySelector(SCROLLER_QUERY);
    await sleep(2000);
    if (maybeLoaders.length > 1) {
      // We should have two load more buttons, unless we've hit the top.
      console.log("Clicking load more.");
      maybeLoaders[0].click();
      await sleep(2000);
    } else if (scroller_ && scroller_.scrollTop !== 0) {
      // If we don't have any load more buttons, just try scrolling up.
      console.log("Trying to scroll up.");
      try {
        scroller_.scrollTop = 0;
      } catch (err) {
        console.log(err);
      }

      // Remove all of the previously covered messages from the DOM to try and
      // save memory.
      // let messages = document.querySelector(MESSAGES_QUERY);
      // console.log("Removing elements from: ", messages);
      // while (messages.childNodes.length > 150) {
      //   messages.removeChild(messages.lastChild);
      // }

      // Don't continue until the loading animation is gone.
      await sleep(2000);
      let loader = document.querySelector(LOADING_QUERY);
      while (loader) {
        console.log("Waiting for loading messages to populate...", loader);
        await sleep(2000);
        loader = document.querySelector(LOADING_QUERY);
      }
    } else {
      // There's no Load More button and there's no more scrolling up, so we
      // probably sucessfully finished. Bubble this info back up.
      console.log("Reached top of chain: ", scroller_.scrollTop);
      return { status: STATUS.COMPLETE };
    }

    // And then run the whole thing again after 500ms for loading if we didnt
    // have any removals (to zoom up quickly), or 5s if we did have removals to
    // avoid any rate limiting.
    if (more_button_count === 0) {
      return { status: STATUS.CONTINUE, data: 500 };
    } else {
      return { status: STATUS.CONTINUE, data: 5000 };
    }
  }

  async function runner(count) {
    console.log("Starting runner removal for N iterations: ", count);
    for (let i = 0; i < count || !count; ++i) {
      console.log("Running count:", i);
      const sleepTime = await unsendAllVisibleMessages(i == count - 1);
      if (sleepTime.status === STATUS.CONTINUE) {
        await sleep(sleepTime.data);
      } else if (sleepTime.status === STATUS.COMPLETE) {
        return STATUS.COMPLETE;
      }
    }
    console.log("Completed run.");
    return STATUS.CONTINUE;
  }

  async function enterSearchbar(searchText) {
    // Get the search bar and set the text to search for. Make sure things have
    // actually loaded.
    console.log("Set up search bar. Starting removal process.");
    let searchInConvo = null;
    for (let i = 0; !searchInConvo || i < 10; ++i) {
      searchInConvo = [
        ...document.querySelectorAll(SEARCH_IN_CONVO_QUERY)
      ].filter(el => el.innerHTML === "Search in Conversation")[0];

      if (!searchInConvo) await sleep(5000);
    }

    if (!searchInConvo) {
      console.log(
        "Could not find Search In Conversation button after 50 seconds."
      );
      return STATUS.ERROR;
    }

    console.log("Got searchInConvo: ", searchInConvo);

    let searchBar = document.querySelector(SEARCH_BAR_QUERY);
    let previousSearch = document.querySelector(PREVIOUS_SEARCH_QUERY);

    if (searchBar || previousSearch) {
      // Need to reboot the search bar.
      console.log(
        "Resetting search bar. Previous searchbar found: ",
        searchBar,
        previousSearch
      );
      searchInConvo.click();
      await sleep(2000);
      searchInConvo.click();
      await sleep(2000);
    } else {
      // Need to open the search bar.
      console.log("Opening search bar. No searchbar found: ", searchBar);
      searchInConvo.click();
      await sleep(2000);
    }

    // Either way, need to re-query the search bar because we recreated it.
    searchBar = document.querySelector(SEARCH_BAR_QUERY);
    searchBar.focus();
    searchBar.value = searchText;

    // Trigger the search.
    console.log("Searching for: ", searchText);
    const ke_down = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      keyCode: 13
    });
    searchBar.dispatchEvent(ke_down);

    const ke_up = new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      keyCode: 13
    });
    document.body.dispatchEvent(ke_up);

    // Look for the message that best matches searchText.
    // As a heuristic, we stop at the first message where every highlighted
    // word also appears in the searchText. This has obvious failure modes,
    // but is also probably sufficient for natural language.
    const nextButton = document.querySelectorAll(NEXT_SEARCH_QUERY)[0];
    const expectedMatcherLength = searchText
      .split(/\s+/)
      .filter(word => word.length > 3).length;
    console.log("Looking for message with N matches: ", expectedMatcherLength);
    for (let i = 0; i < 20; ++i) {
      await sleep(5000);
      const highlighted = document.querySelectorAll(HIGHLIGHTED_QUERY);
      console.log("Highlighted: ", highlighted);
      if (highlighted.length === 0) {
        // Hit a weird case where the search button wasn't actually pressed.
        // Return error.
        console.log("Search text not indexed by facebook. Returning error.");
        return STATUS.ERROR;
      }
      const allInQuery = [...highlighted].map(el =>
        searchText.includes(el.innerHTML)
      );
      console.log("Query selection: ", allInQuery);
      if (allInQuery.filter(Boolean).length >= expectedMatcherLength) {
        console.log("Got the closest match for search text.");
        return STATUS.CONTINUE;
      }
      console.log("Did not find match for search text, continuing");
      nextButton.click();
    }
    console.log("Could not find any matches for search: ", searchText);
    return STATUS.ERROR;
  }

  async function getNextSearchText(searchText) {
    // Get all the candidate search messages. Cut each one down to a 15 word
    // string. Remove any that are the same as the current searchText or have
    // fewer than 5 words with length greater than 3.
    const candidates = [...document.querySelectorAll(SEARCH_CANDIDATE_QUERY)];
    console.log("Candidates: ", candidates);
    const processedCandidates = candidates
      .map(el =>
        el.innerText
          .split(/\s+/)
          .slice(0, 15)
          .join(" ")
      )
      .filter(text => {
        if (
          text !== searchText &&
          text.split(/\s+/).filter(word => word.length > 3).length > 5
        ) {
          return true;
        }
        return false;
      });
    console.log("Processed candidates: ", processedCandidates);

    // Next, reset the search bar to bring us back down to the beginning, and
    // then try and find the next best matching search point.
    for (let candidate of processedCandidates) {
      console.log("Testing search candidate: ", candidate);
      if ((await enterSearchbar(candidate)) === STATUS.CONTINUE) {
        console.log("Found match for candidate: ", candidate);
        return { status: STATUS.CONTINUE, data: candidate };
      }
    }

    console.log(
      "No candidate within list of processedCandidates found.",
      processedCandidates
    );
    return STATUS.ERROR;
  }

  async function longChain(count, runnerCount, prevSearchText) {
    let searchText = "";

    if (prevSearchText) {
      console.log("Got search text: ", prevSearchText);
      const prevSearchStatus = await enterSearchbar(prevSearchText);
      if (prevSearchStatus === STATUS.CONTINUE) {
        console.log("Successfully reloaded old state. Starting runner.");
        searchText = prevSearchText;
      }
    }

    for (let i = 0; i < count || !count; ++i) {
      console.log("On run: ", i);
      const status = await runner(runnerCount);
      console.log("Runner status: ", status);
      if (status === STATUS.COMPLETE) return { status: status };

      // TODO(theahura): FB Dec 2021 update kills the search in conversation
      // feature. These queries are outdated.
      //
      // const maybeSearchText = await getNextSearchText(searchText);
      // if (maybeSearchText.status === STATUS.CONTINUE) {
      //   console.log("Next search is: ", maybeSearchText.data);
      //   searchText = maybeSearchText.data;
      // } else {
      //   console.log(
      //     "Encountered error. All messages may not have been deleted."
      //   );

      //   // Check one last time to make sure this was in fact an error and not a
      //   // reason to clear.
      //   console.log("Testing error status.");
      //   const maybeStatus = await runner(actualRunnerCount);
      //   if (maybeStatus === STATUS.COMPLETE) return { status: maybeStatus };
      //   console.log("Confirmed error.");

      //   return { status: STATUS.ERROR };
      // }
    }
    return { status: STATUS.CONTINUE, data: searchText };
  }

  // Scroller functions --------------------------------------------------------
  function scrollToBottomHelper() {
    let scroller = document.querySelectorAll(INBOX_QUERY)[0];
    scroller.scrollTop = scroller.scrollHeight;
  }

  async function scrollToBottom(limit) {
    for (let i = 0; i < limit; ++i) {
      scrollToBottomHelper();
      await sleep(2000);
    }
  }

  // Handlers ------------------------------------------------------------------
  const currentURL =
    location.protocol + "//" + location.host + location.pathname;

  async function removeHandler(msg, tabId) {
    const prevSearchText = msg.prevSearchText
      ? msg.prevSearchText["nextSearchText"]
      : null;

    // TODO(theahura): FB Dec 2021 update kills the search in conversation
    // feature. These queries are outdated.
    const maybeSearchText = await longChain(0, 0, prevSearchText);
    if (maybeSearchText.status === STATUS.COMPLETE) {
      console.log(
        "Possibly successfully removed all messages. Running one more confirmation attempt."
      );
      const confirmSuccess = await longChain(5, 5, prevSearchText);
      if (confirmSuccess.status === STATUS.CONTINUE) {
        console.log("Didnt actually complete. Continuing...");
        msg["prevSearchText"] = confirmSuccess.data;
        removeHandler(msg, tabId);
      } else if (confirmSuccess.status === STATUS.ERROR) {
        console.log("Failed to complete longChain removal.");
      } else {
        console.log("Successful confirmation! All cleared!");
        chrome.runtime.sendMessage({
          action: "TEMP_DELETE",
          data: currentURL,
          response: { tabId: tabId, action: "MARK" }
        });
      }
    } else if (maybeSearchText.status === STATUS.CONTINUE) {
      console.log("Completed runner iteration but did not finish removal.");
      chrome.runtime.sendMessage({
        action: "STORE",
        data: { [currentURL]: { nextSearchText: maybeSearchText.data } }
      });
      chrome.runtime.sendMessage({
        action: "TEMP_STORE",
        data: { [tabId]: { nextSearchText: maybeSearchText.data } },
        response: { tabId: tabId, action: "RELOAD" }
      });
    } else {
      console.log("Failed to complete longChain removal.");
    }
  }

  chrome.runtime.onMessage.addListener(async function(msg, sender) {
    console.log("Got action: ", msg.action);
    const tabId = msg.tabId;
    if (msg.action === "REMOVE") {
      removeHandler(msg, tabId);
    } else if (msg.action === "CONFIRM_REMOVE") {
      const keep_removing = confirm(
        "Continue removing messages from: " +
          msg.prevSearchText["nextSearchText"]
      );
      if (keep_removing) removeHandler(msg, tabId);
    } else if (msg.action === "SCROLL") {
      scrollToBottom(100);
    } else if (msg.action === "RELOAD") {
      window.location = window.location.pathname;
    } else if (msg.action === "MARK") {
      chrome.runtime.sendMessage({
        action: "STORE",
        data: { [currentURL]: { lastCleared: new Date().toDateString() } }
      });
    } else {
      console.log("Unknown action.");
    }
  });

  // Check to see if we need to kick off a removal request.
  console.log("Checking existing removal process.");
  chrome.runtime.sendMessage({
    action: "CHECK_ALREADY_REMOVING"
  });
})();
