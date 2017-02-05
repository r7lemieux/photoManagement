var fs     = require('fs');
var prom   = require('bluebird');
var crypto = require('crypto');
var walk   = require('walk');

prom.promisifyAll(fs);

var hashes, dups, topPath;

hashes = {};
dups = [];
topPath = parseTopPath();

walkPath(topPath);

function parseTopPath() {
  var path = '.';
  if (process.argv[2]) {
    path = process.argv[2];
    if (path.charAt(path.length - 1) === '/') {
      path = path.substr(0, path.length - 1);
    }
  }
  return path;
}

function walkPath(rootpath) {
  var walkOptions = {
    followLinks: false
  };
  walker = walk.walk(rootpath, walkOptions);

  walker.on("file", function (root, fileStats, next) {
    var filepath = root + '/' + fileStats.name;
    return hashFile(filepath)
      .then(hash => {
        storeHash(filepath, fileStats, hash);
        next();
      });
  });
  
  walker.on("directories", function (root, fileStats, next) {
    console.log(`=> processing directory ${root}`);
    next();
  });
  
  walker.on("end", finalize);
  
}

function hashFile(filepath) {
  var hasher = crypto.createHash('sha1');
  return new prom((resolve, reject) => {
    var input = fs.createReadStream(filepath);
    input.on('readable', () => {
      const data = input.read();
      if (data)
        hasher.update(data);
      else {
        var hash = hasher.digest('hex')
        resolve(hash);
      }
    });
  });
}

function storeHash(filepath, fileStats, hash) {
  var fileObj =  {
    filepath: filepath,
    ctime   : fileStats.ctime.getTime(),
    dirDate : getDirDate(filepath)
  };
  if (!hashes[hash]) {
    hashes[hash] = [fileObj];
  } else {
    hashes[hash].push(fileObj);
    hashes[hash].sort( (a,b) => {
      if (a.dirDate !== b.dirDate) {
        return a.dirDate > b.dirDate;
      } else {
        return a.ctime > b.ctime;
      }
    });
  }
}

function getDirDate(path) {
  var dirs = path.split('/');
  var pattern = /\d\d-\d\d-\d\d/;
  var i = dirs.length - 1;
  for (var i = dirs.length - 1; i >= 0 && !dirs[i].match(pattern); i--);
  if (i < 0) {
    return null;
  }
  return dirs[i];
}

function extractDuplicates() {
  var keys = Object.keys(hashes);
  for( h of keys) {
    var fileData = hashes[h];
    if (fileData.length > 1) {
      for (var i=1; i < fileData.length; i++) {
        dups.push(fileData[i].filepath);
      }
    } else {
       delete hashes[h];
    }
  }
  return dups;
}

function storeFileData() {
  fs.writeFileAsync('hashes.json', JSON.stringify(hashes)).then(
    ()=> {
      process.exit(0);
    })
}

function storeDuplicates() {
  fs.writeFileAsync('dups.json', JSON.stringify(dups));
  
}

function finalize() {
  extractDuplicates();
  storeFileData();
  storeDuplicates();
  console.log(`=> ${Object.keys(hashes).length} different files processed`);
  console.log(`=> ${dups.length} duplicates`);

}


