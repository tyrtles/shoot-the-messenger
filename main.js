// Queries for specific elements in the chat interface
const TOP_OF_CHAIN_QUERY = '.xsag5q8.xn6708d.x1ye3gou.x1cnzs8';

// Remove Queries -------------------------------------------------------------
const MY_ROW_QUERY = '.x78zum5.xdt5ytf.x193iq5w.x1n2onr6.xuk3077:has(> span)'; // Used for finding the user's messages and the scroller (parent with scrollTop)
const PARTNER_CHAT_QUERY = '.x6prxxf.x1fc57z9.x1yc453h.x126k92a.xzsf02u'; // Partner chat text innerText, used for searching
const UNSENT_MESSAGE_QUERY = '[aria-label="You unsent a message"]'; // Used to pick up the scroll parent if no own messages are present

// The sideways ellipses used to open the 'remove' menu. Visible on hover.
const MORE_BUTTONS_QUERY = '[aria-label="More"]';

// The button used to open the remove confirmation dialog.
const REMOVE_BUTTON_QUERY = '[aria-label="Remove message"],[aria-label="Remove Message"]';

// The button used to close the 'message removed' post confirmation.
const OKAY_BUTTON_QUERY = '[aria-label="Okay"]';

// Queries related to removal confirmation and errors
const COULDNT_REMOVE_QUERY = '._3quh._30yy._2t_._5ixy.layerCancel';
const REMOVE_CONFIRMATION_QUERY = '[aria-label="Unsend"],[aria-label="Remove"]';
const CANCEL_CONFIRMATION_QUERY = '[aria-label="Who do you want to remove this message for?"] :not([aria-disabled="true"])[aria-label="Cancel"]';

// The loading animation.
const LOADING_QUERY = '[role="main"] svg[aria-valuetext="Loading..."]';

// Things we cannot delete for unknown reasons.
const STICKER_QUERY = '[aria-label$=sticker]';
const LINK_QUERY = '.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.b0tq1wua.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.hrzyx87i.jq4qci2q.a3bd9o3v.lrazzd5p.oo9gr5id.hzawbc8m';
const THUMBS_UP = '[aria-label="Thumbs up sticker"]';

// Search Queries -------------------------------------------------------------
const CONVERSATION_INFO_QUERY = '[aria-label="Conversation information"]';
const SEARCH_TOGGLE_QUERY = '[aria-label="Search"]';
const SEARCH_BAR_QUERY = '[placeholder="Search"]';
const HIGHLIGHTED_TEXT_QUERY = 'span[role="gridcell"] div[role="button"]';
const NEXT_QUERY = '[aria-label="Next"]';

// Constants and Parameters ---------------------------------------------------
const STATUS = {
  CONTINUE: 'continue',
  ERROR: 'error',
  COMPLETE: 'complete',
};

const DELAY = 10;
const RUNNER_COUNT = 10;
const NUM_WORDS_IN_SEARCH = 6;
const MIN_SEARCH_LENGTH = 20;
const DEBUG_MODE = false; // When set, does not actually remove messages.

const currentURL = location.protocol + '//' + location.host + location.pathname;
const searchMessageKey = 'shoot-the-messenger-last-message' + currentURL;
const lastClearedKey = 'shoot-the-messenger-last-cleared' + currentURL;

let scrollerCache = null;
const clickCountPerElement = new Map();

// Helper Functions -----------------------------------------------------------
function getRandom(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function sleep(ms) {
  const randomizedSleep = getRandom(ms, ms * 1.33);
  return new Promise((resolve) => setTimeout(resolve, randomizedSleep));
}

function reload() {
  window.location = window.location.pathname;
}

function getScroller() {
  if (scrollerCache) return scrollerCache;

  let el;
  try {
    const query = `${MY_ROW_QUERY}, ${PARTNER_CHAT_QUERY}, ${UNSENT_MESSAGE_QUERY}`;
    el = document.querySelector(query);
    while (!('scrollTop' in el) || el.scrollTop === 0) {
      console.log('Traversing tree to find scroller...', el);
      el = el.parentElement;
    }
  } catch (e) {
    alert(
      'Could not find scroller. This normally happens because you do not ' +
        'have enough messages to scroll through. Failing.'
    );
    console.log('Could not find scroller; failing.');
    throw new Error('Could not find scroller.');
  }

  scrollerCache = el;
  return el;
}

function setNativeValue(element, value) {
  // See https://stackoverflow.com/a/53797269/3269537 and https://github.com/facebook/react/issues/10135#issuecomment-401496776
  const valueSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    'value'
  ).set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    prototype,
    'value'
  ).set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
}

async function submitSearch() {
  // We need to do this in a separate script in the main context.
  // See: https://stackoverflow.com/a/9517879/3269537
  // This is because we need access to specific React properties, which in turn
  // are only available in the main context.
  // Unfortunately, that also means this function has to be highly specific to
  // the search behavior.

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('./submitSearch.js');
  s.dataset.params = JSON.stringify({ searchBarQuery: SEARCH_BAR_QUERY });
  s.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

// Removal functions ---------------------------------------------------------
async function prepareDOMForRemoval() {
  // TODO: filter to only your messages.

  // Get all ... buttons that let you select 'more' for all messages you sent.
  const elementsToUnsend = Array.from(document.querySelectorAll(MY_ROW_QUERY));

  // Get the elements we know we can't unsend.
  const removeQuery = `${STICKER_QUERY}, ${LINK_QUERY}, ${THUMBS_UP}`;
  const elementsToRemove = Array.from(document.querySelectorAll(removeQuery));

  // Add the elements from clickCountPerElement where the count is greater than 3 to elementsToRemove.
  for (let [el, count] of clickCountPerElement) {
    if (count > 3) {
      console.log('Unable to unsend element:', el);
      elementsToRemove.push(el);
    }
  }

  // Once we know what to remove, start the loading process for new messages just in case we lose the scroller.
  getScroller().scrollTop = 0;

  // We can't delete all of the elements because React will crash. Keep the first one.
  elementsToRemove.shift();
  elementsToRemove.reverse();
  console.log('Removing bad rows from DOM:', elementsToRemove);
  for (let badEl of elementsToRemove) {
    await sleep(100);
    let el = badEl;
    try {
      while (el.getAttribute('role') !== 'row') el = el.parentElement;
      el.remove();
    } catch (err) {
      console.log('Skipping row: could not find the row attribute.');
    }
  }

  // Filter the elementsToUnsend list by what is still in the DOM.
  return elementsToUnsend.filter(el => {
    return (
      el.innerText !== 'You unsent a message' && document.body.contains(el)
    );
  });
}

async function unsendAllVisibleMessages(isLastRun) {
  // Prepare the DOM. Get the elements we can remove. Load the next set. Hide the rest.
  const moreButtonsHolders = await prepareDOMForRemoval();

  // Drop the first element in the list, because React needs something to load more messages onto.
  moreButtonsHolders.shift();
  console.log('Found hidden menu holders:', moreButtonsHolders);

  // Reverse list so it steps through messages from bottom and not a seemingly random position.
  for (let el of moreButtonsHolders.slice().reverse()) {
    // Keep current task in view, as to not confuse users, thinking it's not working anymore.
    el.scrollIntoView();
    await sleep(100);

    // Trigger on hover.
    console.log('Triggering hover on:', el);
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await sleep(150);

    // Get the more button.
    const moreButton = document.querySelector(MORE_BUTTONS_QUERY);
    if (!moreButton) {
      console.log('No moreButton found! Skipping holder:', el);
      continue;
    }
    console.log('Clicking more button:', moreButton);
    moreButton.click();

    // Update the click count for the button. This is used to skip elements that refuse to be unsent.
    clickCountPerElement.set(el, (clickCountPerElement.get(el) ?? 0) + 1);

    // Hit the remove button to get the popup.
    await sleep(200);
    const removeButton = document.querySelector(REMOVE_BUTTON_QUERY);
    if (!removeButton) {
      console.log('No removeButton found! Skipping holder:', el);
      continue;
    }
    console.log('Clicking remove button:', removeButton);
    removeButton.click();

    // Hit unsend on the popup. If we are in debug mode, just log the popup.
    await sleep(1000);
    const unsendButton = document.querySelector(REMOVE_CONFIRMATION_QUERY);
    const cancelButton = document.querySelector(CANCEL_CONFIRMATION_QUERY);
    if (DEBUG_MODE) {
      console.log('Skipping unsend because we are in debug mode.', unsendButton);
      cancelButton.click();
      continue;
    } else if (!unsendButton) {
      console.log('No unsendButton found! Skipping holder:', el);
      cancelButton.click();
      continue;
    }
    console.log('Clicking unsend button:', unsendButton);
    unsendButton.click();
    await sleep(1800);
  }
  console.log('Removed all holders.');

  // If this is the last run before the runner cycle finishes, don't keep scrolling up.
  if (isLastRun) {
    if (moreButtonsHolders.length === 0) {
      return { status: STATUS.COMPLETE };
    } else {
      return { status: STATUS.CONTINUE, data: DELAY * 1000 };
    }
  }

  // Now see if we need to scroll up.
  const scroller_ = getScroller();
  const topOfChainText = document.querySelectorAll(TOP_OF_CHAIN_QUERY);
  const elementsToUnsend = Array.from(document.querySelectorAll(MY_ROW_QUERY));
  console.log(
    'topOfChain =', topOfChainText.length,
    'elementToUnsend =', elementsToUnsend.length
  );
  await sleep(2000);
  if (topOfChainText.length === 1 && elementsToUnsend.length <= 1) {
    // We hit the top. Bubble this info back up.
    console.log('Reached top of chain:', topOfChainText);
    return { status: STATUS.COMPLETE };
  } else if (scroller_ && scroller_.scrollTop !== 0) {
    // Scroll up. Wait for the loader.
    let loader = null;
    scroller_.scrollTop = 0;

    for (let i = 0; i < 5; ++i) {
      console.log('Waiting for loading messages to populate...', loader);
      await sleep(2000);
      loader = document.querySelector(LOADING_QUERY);
      if (!loader) break;
    }
  } else {
    // Something is wrong. We don't have load more OR scrolling, but we haven't hit the top either.
    console.log('No scroller or load buttons, but we didn\'t hit the top. Failing.');
    return { status: STATUS.ERROR };
  }

  // Run the whole thing again after 500ms for loading if we didn't have any removals, or 5s if we did to avoid rate limiting.
  if (moreButtonsHolders.length === 0) {
    return { status: STATUS.CONTINUE, data: 100 };
  } else {
    return { status: STATUS.CONTINUE, data: DELAY * 1000 };
  }
}

async function runner(count) {
  console.log('Starting runner removal for N iterations:', count);
  for (let i = 0; i < count; ++i) {
    console.log('Running count:', i);
    const sleepTime = await unsendAllVisibleMessages(i === count - 1);
    if (sleepTime.status === STATUS.CONTINUE) {
      console.log('Sleeping to avoid rate limits:', sleepTime.data / 1000);
      await sleep(sleepTime.data);
    } else if (sleepTime.status === STATUS.COMPLETE) {
      return STATUS.COMPLETE;
    } else {
      return STATUS.ERROR;
    }
  }
  console.log('Completed run.');
  return STATUS.CONTINUE;
}

// Search functions ---------------------------------------------------------

async function runSearch(searchMessage) {
  // Open the search bar.
  const convInfoButton = document.querySelector(CONVERSATION_INFO_QUERY);

  if (convInfoButton.getAttribute('aria-expanded') === 'false') {
    convInfoButton.click();
    await sleep(5000);
  }

  let searchBar = document.querySelector(SEARCH_BAR_QUERY);
  if (!searchBar) {
    document.querySelector(SEARCH_TOGGLE_QUERY).click();
    await sleep(2000);
    searchBar = document.querySelector(SEARCH_BAR_QUERY);
  }

  if (!searchBar) {
    console.log('Could not load search bar. Failing.');
    return false;
  }

  console.log('Found searchBar', searchBar);
  setNativeValue(searchBar, searchMessage);
  await submitSearch();
  await sleep(3000);

  for (let i = 0; i < 20; ++i) {
    // Check the highlighted text.
    const highlighted = [...document.querySelectorAll(HIGHLIGHTED_TEXT_QUERY)];
    console.log('Found highlighted elements:', highlighted);
    try {
      let el = highlighted[0];
      while (el) {
        if (el.innerText === searchMessage) return true;
        el = el.parentElement;
      }
    } catch (err) {
      console.log('Could not get highlighted innerText. Skipping.');
    }

    document.querySelector(NEXT_QUERY).click();
    await sleep(3000);
  }

  return false;
}

async function getSearchableMessage(prevMessage) {
  const availableMessages = [...document.querySelectorAll(PARTNER_CHAT_QUERY)].map((n) => n.innerText);

  // Find a message that wasn't the previous message, with at least five words,
  // with no foreign characters allowed, where the total message length is at least 20 characters.
  const pattern = /^[a-z0-9\s.,?!]+$/i;
  const filtered = availableMessages.filter((t) => {
    return (
      t !== prevMessage &&
      t.split(/\s+/).length >= NUM_WORDS_IN_SEARCH &&
      pattern.test(t) &&
      t.length >= MIN_SEARCH_LENGTH
    );
  });

  // For each available message, validate that it would be a good search from top to bottom.
  for (const message of filtered) {
    // Run the search.
    console.log('Testing candidate message:', message);
    if (await runSearch(message)) return message;
  }

  // Could not find a good searchable message. Realistically, this should be very rare.
  return null;
}

function hijackLog() {
  // Add a log to the bottom left of the screen where users can see what the system is thinking about.
  console.log('Adding log to screen');
  const log = document.createElement('div');
  log.id = 'log';
  log.style.position = 'fixed';
  log.style.bottom = '0';
  log.style.left = '0';
  log.style.backgroundColor = 'white';
  log.style.padding = '10px';
  log.style.zIndex = '10000';
  log.style.maxWidth = '200px';
  log.style.maxHeight = '500px';
  log.style.overflow = 'scroll';
  log.style.border = '1px solid black';
  log.style.fontSize = '12px';
  log.style.fontFamily = 'monospace';
  log.style.color = 'black';
  document.body.appendChild(log);

  // Hijack the console.log function to also append to our new log element.
  const oldLog = console.log;
  console.log = function (...args) {
    oldLog.apply(console, args);
    log.innerText += '\n' + args.join(' ');
    log.scrollTop = log.scrollHeight;
  };
  console.log('Successfully added log to screen');
  console.log('To see more complete logs, hit F12 or open the developer console.');
  return log;
}

// Handlers ------------------------------------------------------------------
async function removeHandler() {
  hijackLog();

  console.log('Sleeping to allow the page to load fully...');
  await sleep(10000); // Give the page a bit to fully load.

  const maybeSearchMessage = localStorage.getItem(searchMessageKey);
  if (maybeSearchMessage) {
    console.log('Attempting to run search with message:', maybeSearchMessage);
    const searchResult = await runSearch(maybeSearchMessage);
    if (!searchResult) {
      alert(`Unable to find message: ${maybeSearchMessage}. Failing.`);
      return null;
    }
  }

  const status = await runner(RUNNER_COUNT);

  if (status === STATUS.COMPLETE) {
    localStorage.removeItem(searchMessageKey);
    localStorage.setItem(lastClearedKey, new Date().toString());
    console.log('Success!');
    alert('Successfully cleared all messages!');
    return null;
  } else if (status === STATUS.CONTINUE) {
    console.log('Completed runner iteration but did not finish removal.');
    const lastSearched = localStorage.getItem(searchMessageKey);
    const searchableMessage = await getSearchableMessage(lastSearched);
    if (searchableMessage) {
      console.log('Going to search for:', searchableMessage);
      localStorage.setItem(searchMessageKey, searchableMessage);
      reload();
    } else {
      console.log('Could not find a searchable message.');
    }
  }

  console.log('Failed to complete removal.');
  alert('ERROR: something went wrong. Failed to complete removal.');
}

// Main ----------------------------------------------------------------------

// Hacky fix to avoid issues with removing/manipulating the DOM from outside
// React control.
// See: https://github.com/facebook/react/issues/11538#issuecomment-417504600
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) {
        console.error(
          'Cannot remove a child from a different parent',
          child,
          this,
        );
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.error(
          'Cannot insert before a reference node from a different parent',
          referenceNode,
          this,
        );
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

(async function () {
  chrome.runtime.onMessage.addListener(async function (msg, sender) {
    // Ensure we are using English language messenger.
    if (document.documentElement.lang !== 'en') {
      alert(
        'ERROR: detected non-English language. Shoot the Messenger only works when Facebook settings are set to English. Please change your profile settings and try again.',
      );
      return;
    }

    console.log('Got action:', msg.action);
    switch (msg.action) {
      case 'REMOVE':
        const doRemove = confirm(
          'Removal will nuke your messages and will prevent you from seeing the messages of other people in this chat. We HIGHLY recommend backing up your messages first. Continue?',
        );
        if (doRemove) {
          removeHandler();
        }
        break;
      case 'STOP':
        localStorage.removeItem(searchMessageKey);
        reload();
        break;
      case 'UPDATE_DELAY':
        console.log('Setting delay to', msg.data, 'seconds');
        DELAY = msg.data;
        break;
      default:
        console.log('Unknown action.');
        break;
    }
  });

  // Check if we need to kick off a removal request.
  if (localStorage.getItem(searchMessageKey)) {
    removeHandler();
  }
})();
