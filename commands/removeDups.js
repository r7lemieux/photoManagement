var fs     = require('fs');
var prom   = require('bluebird');
var crypto = require('crypto');
var walk   = require('walk');

prom.promisifyAll(fs);

var hashes, dups, topPath;

loadDups();
deleteDups();
console.log('done');

function loadDups() {
  var dupsText = fs.readFileSync('./dups.json');
  dups         = JSON.parse(dupsText);
}

function deleteDups() {
  for (var i = 0; i < dups.length; i++) {
    var dup = dups[i];
    var escapedDup = dup.replace(/ /g,'\\ ');
    fs.unlinkAsync(escapedDup)
      .catch(err => {
        console.log(`Fail to remove ${dup} ${err}`);
      })
  }
}

