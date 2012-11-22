var path = require('path'),
    mkdirp = require('mkdirp');

var homeDir = process.env.XDG_CONFIG_HOME ||
    process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

module.exports = function(id) {
    var p = path.join(homeDir, '.config', id);
    mkdirp.sync(p);
    return p;
}
