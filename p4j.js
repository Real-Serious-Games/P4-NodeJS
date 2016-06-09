'use strict';


module.exports = function (config, log) {

	if (!log) {
		log = {
			verbose: function (msg) {
				console.log(msg);
			},

			info: function (msg) {
				console.log(msg);
			},

			warn: function (msg) {
				console.warn(msg);
			},

			error: function (msg) {
				console.error(msg);
			},
		};
	}

	var exec = require('./exec')(config, log);
	var spawn = require('./spawn')(config, log);
	var Promise = require('promise');
	var quote = require('quote');
	var path = require('path');
	var S = require('string');
	var glob = require('glob');
	var fs = require('fs');

	var self = this;

	//
	// Validate configuration.
	//
	var validateConfig = function () {
		if (!config) {
			throw new Error("Config not supplied");
		}

		if (!config.p4User) {
			throw new Error("p4User not specified in config");	
		}

		if (!config.p4Workspace) {
			throw new Error("p4Workspace not specified in config");	
		}

		if (!config.p4Host) {
			throw new Error("p4Host not specified in config");	
		}

		if (!config.p4ExePath) {
			throw new Error("p4ExePath not specified in config");	
		}		

		if (!config.workingDirectory) {
			throw new Error("workingDirectory not specified in config");	
		}		
	};

	//
	// Python script that runs p4 and converts output to json.
	//
	var p4PythonScript = path.join(__dirname, 'p4_to_json.py');

	var execBufferSize = 1024 * 1024;

	// 
	// Run a p4 command and return a promise that delivers json results.
	//
	var p4Cmd = function (p4Args, stdin) {

		var cmd = [
			"python",
			quote(p4PythonScript),
			p4Args
		].join(' ');

		return exec(cmd, { cwd: config.workingDirectory, stdin: stdin })
			.then(function (output) {
				return JSON.parse(output);
			});
	};

	//
	// Get latest files for a particular path.
	//
	// options
	//		force: 	true|false		Enables Perforce force get, overwriting all files (be careful with this!)
	//
	self.getLatest = function (path, options) {
		if (!path) {
			throw new Error('Path to get-latest not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"sync", 
		];

		if (options.force) {
			p4Args.push('-f');
		}

		p4Args.push(path);

		return spawn("p4", p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	},


	//
	// Create a new change set with a specified name.
	// Returns a promise that delivers the ID of the change set or an error.
	//
	self.createChangeSet = function (changeSetName) {

		if (!changeSetName) {
			throw new Error('Change set name not specified.');			
		}

		var changeSpec = 
			"Change: new\n" +
			"Description: " + changeSetName + "\n";				

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"change", 
			"-i"
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				stdin: changeSpec,
				maxBuffer: execBufferSize,
			})
			.then(function (output) {
				var matched = /Change (\d+) created/.exec(output);
				if (!matched) {
					throw new Error("Failed to create change set: " + changeSetName);
				}
				return matched[1];
			});
	};

	//
	// List all change sets for the user.
	//
	self.getPendingChangeSets = function () {

		var p4Args = quote([
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"changes", 
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-s", 'pending',
			"-l"
		].join(' '));

		return p4Cmd(p4Args);
	};

	//
	// Get the ID of an existing named change set.
	// Returns a promise that delivers the ID of the change set or an error.
	//
	self.findChangeSet = function (changeSetName) {

		if (!changeSetName) {
			throw new Error('Change set name not specified.');			
		}

		return self.getPendingChangeSets()
			.then(function (json) {
				var matchingChangeSets = json.filter(function (item) {
					return S(item.desc).contains(changeSetName);
				});

				if (matchingChangeSets.length == 0) {
					throw new Error("No matching changes sets found that match name '" + changeSetName + "'");
				}
				else if (matchingChangeSets.length > 1) {
					throw new Error("Multiple changes sets found that match name '" + changeSetName + "'");	
				}
				else {
					return matchingChangeSets[0].change;
				}
			});
	};

	//
	// Check out specified files to the named changed set.
	//
	self.checkOut = function (changeSetId, path) {
		if (!changeSetId) {
			throw new Error('Change set id not specified.');			
		}

		if (!path) {
			throw new Error('Path to checkout not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"edit", 
			"-c", changeSetId,
			quote(path)
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	};
	
	//
	// Add dir to changeset.
	//
	self.addDirToChangeSet = function (changeSetId, dir, globPatern) {
		if (!changeSetId) {
			throw new Error('Change set id not specified.');
		}
		
		if (!dir) {
			throw new Error('Directory to add not specified.');
		}
		
		globPatern = globPatern || "/**/*"
		
		var filesListFileName = "files.txt";
		
		var globOptions = {};
		globOptions.sync = true;
		globOptions.nodir = true;
		
		var os = require('os');
		fs.writeFileSync(filesListFileName, glob(dir + globPatern, globOptions).join(os.EOL));
			
		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"-x", path.join(config.workingDirectory, filesListFileName),
			"add",
			"-c", changeSetId
		]
		
		return spawn("p4", p4Args, {
				cwd: dir,
				maxBuffer: execBufferSize,
			});
	}

	//
	// Revert all checked out files.
	//
	self.revertAll = function (path) {

		if (!path) {
			throw new Error('Path to checkout not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"revert", 
			quote(path)
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	};

	//
	// Revert files that have not changed.
	//
	self.revertUnchanged = function (path) {

		if (!path) {
			throw new Error('Path to checkout not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"revert", 
			"-a",
			quote(path)
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	};

	//
	// Delete all change lists that are empty.
	//
	self.deleteEmptyChangeSets = function () {

		return self.getPendingChangeSets()
			.then(function (changeSets) {
				return Promise.all(changeSets.filter(function (changeSet) {
					return self.deleteEmptyChangeSet(changeSet.change);
				}));
			});
	};

	//
	// Delete a single empty change set specified by id.
	//
	self.deleteEmptyChangeSet = function (changeSetId) {

		if (!changeSetId) {
			throw new Error('Change set id not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"change", 
			"-d", changeSetId,
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	};

	//
	// Submit checked-out files to the repo.
	//
	self.submit = function (changeSetId) {

		if (!changeSetId) {
			throw new Error('Change set id not specified.');			
		}

		var p4Args = [
			"-u", config.p4User,
			"-c", config.p4Workspace,
			"-p", config.p4Host,
			"submit", 
			"-c", changeSetId,
		].join(' ');

		return exec("p4 " + p4Args, {
				cwd: config.workingDirectory,
				maxBuffer: execBufferSize,
			});
	};

	validateConfig();
};