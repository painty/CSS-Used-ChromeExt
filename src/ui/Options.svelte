<script lang="ts">
  import logo from '/src/assets/logo.png'
  /* global chrome */
  let convUrlToAbsolute = true
  let buttonText = 'Save'
  function requestPermission() {
    // Permissions must be requested from inside a user gesture, convUrlToAbs a button's
    // click handler.
    chrome.permissions.request(
      {
        permissions: ['storage'],
      },
      function (granted) {
        // The callback argument will be true if the user granted the permissions.
        // console.log('granted',granted);
        if (granted) {
          save_options()
        } else {
        }
      }
    )
  }

  // function removePermission() {
  //   chrome.permissions.remove(
  //     {
  //       permissions: ['storage'],
  //     },
  //     function (removed) {
  //       // console.log('removed',removed);
  //       if (removed) {
  //         // The permissions have been removed.
  //       } else {
  //         // The permissions have not been removed (e.g., you tried to remove
  //         // required permissions).
  //       }
  //     }
  //   )
  // }

  function checkPermission() {
    chrome.permissions.contains(
      {
        permissions: ['storage'],
      },
      function (result) {
        if (result) {
          // The extension has the permissions.
          restore_options()
        } else {
          // The extension doesn't have the permissions.
        }
      }
    )
  }

  // Saves options to chrome.storage
  function save_options() {
    chrome.storage.sync.set(
      {
        convUrlToAbsolute: convUrlToAbsolute,
      },
      function () {
        // Update status to let user know options were saved.
        buttonText = 'Saved'
        setTimeout(function () {
          buttonText = 'Save'
        }, 750)
      }
    )
  }

  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  function restore_options() {
    // Use default value color = 'red' and convUrlToAbsolute = true.
    chrome.storage.sync.get(
      {
        convUrlToAbsolute: true,
      },
      function (items) {
        convUrlToAbsolute = items.convUrlToAbsolute
      }
    )
  }
  checkPermission()
</script>

<main>
  <h1>
    <a
      href="https://chrome.google.com/webstore/detail/css-used/cdopjfddjlonogibjahpnmjpoangjfff"
      target="_blank"
      rel="noreferrer"
    >
      <img src={logo} class="logo" alt="CSS Used Logo" />
    </a>
    CSS Used Options
  </h1>

  <div class="form-item form-item__checkbox">
    <div class="form-item-content">
      <label>
        <input type="checkbox" bind:checked={convUrlToAbsolute} />
        Convert url to absolute path in css rules.
      </label>
    </div>
    <div class="form-item-tips">
      * eg. <code>background: url(./bg.jpg)</code> ->
      <code>background: url(https://example.com/assets/bg.jpg)</code>
    </div>
    <div class="form-item-tips">
      * Without absolute url, the Preview/CodePen may not work, for the
      protocols and domains are different.
    </div>
    <div class="form-item-tips">
      * The inspected page need a refresh for changes to take effect.
    </div>
  </div>

  <div class="card">
    <button on:click={requestPermission}>{buttonText}</button>
  </div>

  <div class="separator" />

  <p>
    Source code on <a
      href="https://github.com/painty/CSS-Used-ChromeExt"
      target="_blank"
      rel="noreferrer">GitHub</a
    >
  </p>
</main>

<style>
  main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }
  h1 {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .separator {
    border-top: 1px dashed #2e4f1ebf;
  }
  .logo {
    height: 1em;
    margin-right: 0.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 0.3em #98ff64bf);
  }
  .form-item {
    text-align: left;
  }
  .form-item-tips {
    color: #888;
    font-size: 0.3em;
    line-height: 1.6;
    padding-left: 4em;
  }
</style>
