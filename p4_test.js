'use strict';

try
{
	var argv = require('yargs').argv;
	var args = argv._;

	if (args.length !== 1) {
		console.log('Usage: node p4_test <p4-local-path>');
		process.exit(1);
		return;
	}

	var repoPath = args[0]; // Example: c:\perforce\myrepo\somesubdir\...


	var path = require('path');
	var config = require('./p4_test_config')
	var P4 = require('./p4j');

	var p4 = new P4(config);

	console.log('Getting latest of ' + repoPath);

	p4.getLatest(repoPath, { force: true })
		.then(function () {
			console.log('Got latest of ' + repoPath);
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err.stack);
		})
		.done(function () {
			console.log('done');
		});

/*
	p4.deleteEmptyChangeSets(repoPath)
		.then(function () {
			return p4.createChangeSet("Build Test");
		})
		.then(function (changeSetId) {
			return p4.checkOut(changeSetId, )
				.then(function () {
					return p4.submit(changeSetId);
				});
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err.stack);
		})
		.done(function () {
			console.log('done');
		});

	p4.deleteEmptyChangeSets()
		.catch(function (err) {
			console.log('Error:');
			console.log(err);
		})
		.done(function () {
			console.log('done');
		});

	p4.getPendingChangeSets()
		.then(function (changeSets) {
			console.log(changeSets);
		});

	p4.findChangeSet('Build Test')
		.then(function (changeSetId) {
			return p4.revertAll(changeSetId, repoPath);
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err);
		})
		.done(function () {
			console.log('done');
		});

	p4.createChangeSet('Build Test')
		.then(function (changeSetId) {
			return p4.checkOut(changeSetId, repoPath);
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err);
		})
		.done(function () {
			console.log('done');
		});

	p4.createChangeSet('ding ding')
		.then(function (output) {
			console.log('then');
			console.log(output);
			return output;
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err);
		})
		.done(function () {
			console.log('done');
		});

	p4.findChangeSet('Build')
		.then(function (output) {
			console.log('then');
			console.log(output);
			return output;
		})
		.catch(function (err) {
			console.log('Error:');
			console.log(err);
			console.log(err.stack);
		})
		.done(function () {
			console.log('done');
		});
*/
}
catch (e)
{
	console.log('Exception')
	console.log(e.stack);
}