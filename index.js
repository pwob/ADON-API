'use strict';

const _ = require('lodash');
const config = require('config');
const EventEmitter = require('events');
const Hapi = require('hapi');
const Logger = require('./adon-logger');
const Promise = require('bluebird');
const url = require('url');
let _hapi, _logger, _routes, _plugins;

class RestHapiServer extends EventEmitter {

	constructor() {
		super();
		let dotenv_result;
		//get configurations
		if (_.get(config.server, 'env_path')) {
			const env_path = _.get(config.server, 'env_path');
			console.log('[ENV] Loading config path from ' + env_path);
			dotenv_result = require('dotenv').config({ path: env_path }); //load specific .env file
			if (!dotenv_result || dotenv_result.error) {
				console.error('[ENV] Error occured! cannot load env file at "' + env_path + '". ' +
					'Please make sure it points to the specific file');
				process.exit(1);
			}
		} else {
			console.log('[ENV] Loading config path from root project folder');
			dotenv_result = require('dotenv').config();
		}
		//set logger level
		_logger = new Logger(process.env.LOGGING_LEVEL || 'info');

		const root_path = _.get(config.server, 'root_path') || process.cwd();
		_.set(this, 'path.root', root_path);
		_logger.info('server', 'Initializing from ' + root_path + '...');
		// Create a _hapi with a host and port
		let host_url;

		//Set the connections
		if (!process.env.API_SERVER_HOST_URL) {
			_logger.info('env', 'Configuration API_SERVER_HOST_URL not found...');
			_logger.info('env', 'Using default "http://localhost:8000"');
			host_url = url.parse('http://localhost:8000');
		} else {
			_logger.info('env', 'config API_SERVER_HOST_URL found!');
			host_url = url.parse(process.env.API_SERVER_HOST_URL);
		}

		const hapi_config = {
			host: 'localhost',
			port: 8000
		};
		if (host_url.hostName) {
			hapi_config.host = host_url.hostName;
		}
		if (host_url.port) { hapi_config.port = host_url.port; }

		//initiate server instance
		_hapi = new Hapi.Server(hapi_config);
		this.hapi = _hapi;

		_plugins = require('./plugin-manager')(this);
		_routes = require('./route-manager')(this);
	}

	start() {
		_logger.info('server', 'Start invoked...');
		return new Promise((resolve, reject) => {
			this.emit('starting', this);

			//Start the _hapi
			_hapi.start((err) => {
				if (err) {
					return reject(err);
				}
				_logger.info('server', 'Successfully started at:', _hapi.info.uri);
				_logger.info('server', 'Runing start event...');
				this.emit('started', _hapi);
				resolve(_hapi);
			});
		});
	}

	log(level, sender, message, data) {
		_logger[level](sender, message, data);
	}

	get routes() {
		return _routes;
	}

	get plugins() {
		return _plugins;
	}

}

module.exports = RestHapiServer;