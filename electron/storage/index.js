const fs = require('fs');
const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const storage = require('electron-json-storage');

const HOMEDIR = os.userInfo({
    encoding: 'string'
}).homedir;


function init() {
    const preferencesDir = path.join(HOMEDIR, '.sphinx-relay', 'preferences');
    mkdirp(preferencesDir);
    storage.setDataPath(preferencesDir);
    return storage;
}

module.exports = init();