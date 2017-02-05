var fs = require('fs');
var bpromise =
process.argv.slice(2).forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});

console.log('=> __filename ' + __filename);
console.log('=> __dirname ' + __dirname);

