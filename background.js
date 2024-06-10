(function () {
  // Function to send message to the active tab
  function sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { tabId: tabs[0].id, ...message });
      } else {
        console.error('No active tab found.');
      }
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Got request: ', request);
    
    // Handle different actions
    switch (request.action) {
      case 'REMOVE':
      case 'UPDATE_DELAY':
      case 'STOP':
        sendMessageToActiveTab(request);
        break;
      default:
        console.error('Unknown action requested: ', request.action);
        break;
    }
  });
})();
