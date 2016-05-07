var dotenv = require('dotenv');
dotenv.load();
var ipm2 = require('pm2-interface')();
var _ = require('lodash');
var moment = require('moment');
var async = require('async');
var StatsD = require('node-statsd')

var services = (process.env.SERVICES || '').split(',');
var statsdClient = new StatsD({
    host: process.env.STATSD_HOST || 'localhost',
    port: process.env.STATSD_PORT || 8125,
    prefix: process.env.STAT_PREFIX || '',
    suffix: process.env.STAT_SUFFIX || ''
});

var STAT_MEM_USAGE = 'memory';
var STAT_CPU_USAGE = 'cpu'

ipm2.on('ready', function() {
    console.log('Connected to pm2');

    var interval = process.env.INTERVAL || 30000;

    setTimeout(function() {
        ipm2.rpc.getMonitorData({}, function(err, data) {
            if (!err && data) {
                processPm2Data(data);
            }
        });
    }, interval);

    //ipm2.bus.on('*', function(event, data) {
    //      console.log('Event', event);
    //      console.log('Data', data);
    //});


});

function processPm2Data(data) {
    if (_.isArray(data)) {
        async.each(data, function(serviceInfo) {
            if (services.indexOf(serviceInfo.name) > -1) {
                var memoryInByte = serviceInfo.monit.memory;
                var memoryInMB = Math.round(100 * memoryInByte / (1024 * 1024)) / 100;
                statsdClient.histogram(STAT_MEM_USAGE + '.' + serviceInfo.name, memoryInMB);
                statsdClient.histogram(STAT_CPU_USAGE + '.' + serviceInfo.name, serviceInfo.monit.cpu);
            }
        });
    }
}
