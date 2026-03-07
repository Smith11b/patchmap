chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "PATCHMAP_FETCH") {
    return;
  }

  const { url, options } = message;

  fetch(url, options)
    .then(async (response) => {
      const text = await response.text();

      sendResponse({
        ok: response.ok,
        status: response.status,
        text,
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Fetch failed",
      });
    });

  return true;
});
