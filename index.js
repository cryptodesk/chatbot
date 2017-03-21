let dotenv = require('dotenv');
let botkit = require('botkit');
let commandLineArgs = require('command-line-args');
let localtunnel = require('localtunnel');

dotenv.config();

const CONVERSATION_STATUS_HELLO = 1;
const CONVERSATION_STATUS_OFERTAS = 2;
const CONVERSATION_STATUS_DIRECCION = 3;
const CONVERSATION_STATUS_PAGO = 4;
const CONVERSATION_STATUS_FEEDBACK = 5;
let conversations = {};

const ops = commandLineArgs([
      {name: 'lt', alias: 'l', args: 1, description: 'Use localtunnel.me to make your bot available on the web.',
      type: Boolean, defaultValue: false},
      {name: 'ltsubdomain', alias: 's', args: 1,
      description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
      type: String, defaultValue: null},
]);

let controller = botkit.facebookbot({
    debug: true,
    log: true,
    access_token: process.env.FACEBOOK_PAGE_TOKEN,
    verify_token: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
    app_secret: process.env.FACEBOOK_APP_SECRET,
    validate_requests: true,
});

let bot = controller.spawn({});

controller.setupWebserver(process.env.port || 3000, (err,webserver) => {
    controller.createWebhookEndpoints(controller.webserver, bot, () => {
        if(ops.lt) {
            var tunnel = localtunnel(process.env.port || 3000, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
                if (err) {
                    console.log(err);
                    process.exit();
                }
                console.log("Your bot is available on the web at the following URL: " + tunnel.url + '/facebook/receive');
            });

            tunnel.on('close', function() {
                console.log("Your bot is no longer available on the web at the localtunnnel.me URL.");
                process.exit();
            });
        }
    });
});
controller.api.messenger_profile.menu({});
controller.api.messenger_profile.delete_menu();

controller.hears(['hola'], 'message_received', (bot, message) => {
    bot.reply(message, 'Hola, somos instamaki.');
    bot.reply(message, '¿que podemos hacer por tí?');
    conversations[message.channel] = CONVERSATION_STATUS_HELLO;
});

controller.hears(['ofertas'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel] === CONVERSATION_STATUS_HELLO){
        bot.reply(message, 'Actualmente tenemos disponible las siguientes ofertas:');
        bot.reply(message, 'Oferta A: 12 Piezas por 8€');
        bot.reply(message, 'Oferta B: 18 Piezas por 12€');
        bot.reply(message, 'Oferta C: 24 Piezas por 18€');
        conversations[message.channel] = CONVERSATION_STATUS_OFERTAS;
    }
});

controller.hears(['\\bA\\b', '\\bB\\b', '\\bC\\b'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel] === CONVERSATION_STATUS_OFERTAS){
        bot.reply(message, 'Muy buena elección!');
        bot.reply(message, '¿Donde quieres que te lo enviemos?');
        bot.reply(message, 'Si quieres, puedes enviarnos tu ubicación');
        conversations[message.channel] = CONVERSATION_STATUS_DIRECCION;
    }
});

controller.hears(['location'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel] === CONVERSATION_STATUS_DIRECCION){
        bot.reply(message, 'Estas a un paso de recibir tu sushi en casa.');
        bot.reply(message, 'Puedes pagar tu pedido en la siguiente link https://goo.gl/eId2qI');
        conversations[message.channel] = CONVERSATION_STATUS_PAGO;
        setTimeout(() => {
            bot.reply(message, '¿Que tal? ¿Te ha gustado tu pedido?');
        }, 30000);
    }
});
