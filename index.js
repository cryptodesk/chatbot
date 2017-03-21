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
      {
          alias: 'l',
          name: 'lt',
          args: 1,
          description: 'Use localtunnel.me to make your bot available on the web.',
          type: Boolean,
          defaultValue: false
      },
      {
          name: 'ltsubdomain',
          alias: 's',
          args: 1,
          description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
          type: String,
          defaultValue: null
      },
]);

let controller = botkit.facebookbot({
    debug: false,
    log: true,
    access_token: process.env.FACEBOOK_PAGE_TOKEN,
    verify_token: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
    app_secret: process.env.FACEBOOK_APP_SECRET,
    validate_requests: true,
    receive_via_postback: true,
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
                console.log('Your bot is available on the web at the following URL: ' + tunnel.url + '/facebook/receive');
            });

            tunnel.on('close', function() {
                console.log('Your bot is no longer available on the web at the localtunnnel.me URL.');
                process.exit();
            });
        }
    });
});

controller.hears(['hola'], 'message_received', (bot, message) => {
    bot.startConversation(message, (err, convo) => {
        convo.say('Hola, somos instamaki.');
        convo.say({
            attachment: {
                'type':'template',
                'payload':{
                    'template_type':'button',
                    'text':'¿que podemos hacer por tí?',
                    'buttons':[
                        {
                            'type':'postback',
                            'title':'Ver ofertas',
                            'payload':'ofertas'
                        },
                        {
                            'type':'postback',
                            'title':'Consultar locales',
                            'payload':'locales'
                        }
                    ]
                }
            }
        });
    });
    conversations[message.channel] = {
        status: CONVERSATION_STATUS_HELLO,
        coordinates: undefined,
        items: []
    };
});

controller.hears(['ofertas', 'pedido'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_HELLO){
        bot.startConversation(message, (err, convo) => {
            convo.ask({
                attachment: {
                    'type':'template',
                    'payload':{
                        'template_type':'button',
                        'text':'Actualmente tenemos disponible las siguientes ofertas:',
                        'buttons':[
                            {
                                'type':'postback',
                                'title':'Oferta A: 12 Piezas por 8€',
                                'payload':'A'
                            },
                            {
                                'type':'postback',
                                'title':'Oferta B: 18 Piezas por 12€',
                                'payload':'B'
                            },
                            {
                                'type':'postback',
                                'title':'Oferta C: 24 Piezas por 18€',
                                'payload':'C'
                            }
                        ]
                    }
                }
            }, (response, convo2) => {
                conversations[message.channel].items.push(response.text);
                conversations[message.channel].status = CONVERSATION_STATUS_OFERTAS;
                convo.next();
            });
            //if(response =! ())
            convo.say('Muy buena elección!');
            convo.say('¿Donde quieres que te lo enviemos?');
            convo.ask({
                'text': 'Compartir ubicación',
                'quick_replies': [
                    {
                        'content_type': 'location'
                    }
                ]
            }, (response, convo2) => {
            conversations[message.channel].status = CONVERSATION_STATUS_DIRECCION;
                conversations[message.channel].coordinates = response.attachments[0].payload.coordinates;
                convo.next();
            });
            convo.say('Genial! Tu pedido ya está en camino.');
            convo.say('Aquí tienes tu recibo');
            convo.say({
                "attachment":{
                    "type":"template",
                    "payload":{
                        "template_type":"receipt",
                        "recipient_name":"Gabriel Esteban",
                        "order_number":"12345678902",
                        "currency":"EUR",
                        "payment_method":"En efectivo",
                        "timestamp":"1428444852",
                        "elements":[
                                {
                                    "title":"Maki de 24 piezas",
                                    "subtitle":"24 piezas surtidas de excelente calidad",
                                    "quantity":1,
                                    "price":18,
                                    "currency":"EUR",
                                    "image_url":"http://manekinekosushi.com/wp-content/uploads/2016/08/maki_29_-maki_mixto.jpg"
                                }
                        ],
                        "address":{
                            "street_1":"C/ Jordi Girona 1-3 Campus Diagonal Nord",
                            "street_2":"Edific C6 Espai Empren",
                            "city":"Barcelona",
                            "postal_code":"08034",
                            "state":"BCN",
                            "country":"ES"
                        },
                        "summary":{
                            "subtotal":21.6,
                            "shipping_cost":2.95,
                            "total_tax":2.4,
                            "total_cost":26.95
                        }
                    }
                }
            }
            );
            convo.say('Disfruta del sushi!:)');
            conversations[message.channel].status = CONVERSATION_STATUS_PAGO;
        });
    }
});
