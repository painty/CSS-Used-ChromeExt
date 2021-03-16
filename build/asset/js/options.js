/* global chrome */

function requestPermission(){
  // Permissions must be requested from inside a user gesture, convUrlToAbs a button's
  // click handler.
  chrome.permissions.request({
    permissions: ['storage'],
  }, function(granted) {
    // The callback argument will be true if the user granted the permissions.
    // console.log('granted',granted);
    if (granted) {
      save_options();
    } else {

    }
  });
}

function removePermission(){
  chrome.permissions.remove({
    permissions: ['storage'],
  }, function(removed) {
    // console.log('removed',removed);
    if (removed) {
      // The permissions have been removed.
    } else {
      // The permissions have not been removed (e.g., you tried to remove
      // required permissions).
    }
  });
}

function checkPermission(){
  chrome.permissions.contains({
    permissions: ['storage'],
  }, function(result) {
    if (result) {
      // The extension has the permissions.
      restore_options();
    } else {
      // The extension doesn't have the permissions.
    }
  });
}

// Saves options to chrome.storage
function save_options() {
  var convUrlToAbsolute = document.getElementById('convUrlToAbs').checked;
  chrome.storage.sync.set({
    convUrlToAbsolute: convUrlToAbsolute
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and convUrlToAbsolute = true.
  chrome.storage.sync.get({
    convUrlToAbsolute: true
  }, function(items) {
    document.getElementById('convUrlToAbs').checked = items.convUrlToAbsolute;
  });
}
document.addEventListener('DOMContentLoaded', checkPermission);
document.getElementById('save').addEventListener('click', requestPermission);