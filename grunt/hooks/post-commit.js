// hooks/pre-commit.js
 
var exec = require('child_process').exec;
// https://npmjs.org/package/execSync
// Executes shell commands synchronously
var sh = require('execSync').run;
 
exec('git rev-parse --abbrev-ref HEAD', function (err, stdout, stderr) {
 
  // http://stackoverflow.com/a/6376054
  console.log( "Post commit hook - " + stdout );
  if( stdout === 'master') {
      console.log( "Syncing 'proxy' branch with 'master':" );
      sh('git checkout proxy');
      sh('git rebase master');
      sh('git checkout master');
      console.log( "Finished sync!" );
  }
 
});
