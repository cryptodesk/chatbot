let dotenv = require('dotenv');
let botkit = require('botkit');
let commandLineArgs = require('command-line-args');
let localtunnel = require('localtunnel');

dotenv.config();

const CONVERSATION_STATUS_HELLO = 1;
const CONVERSATION_TRADE = 2;
const CONVERSATION_STATUS_USUAL_USER = 6;
const CONVERSATION_STATUS_CRYPTO = 7;
const CONVERSATION_STATUS_INIT = 8;

let crypto=[];

crypto.push({
    name: "ETH",
    amount: 5 ,
    btc: 0.1,
    percentage: '+30%'})

crypto.push({
    name: "BTC",
    amount: 2 ,
    btc: 1,
    percentage: '-2%'})

crypto.push({
    name: "XMR",
    amount: 100 ,
    btc: 0.06 ,
    percentage: '+11%'})

let typing_on = {

    sender_action: "typing_on"
}

let typing_off = {

    sender_action: "typing_off"
}

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
    require_delivery: true,  // aixo ho he ficat despres!!
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




let flag= true ;
controller.on('message_received', (bot, message) => {
    //console.log(message);
    //console.log(flag);
    if(flag&&message.user!=413285102361285){
        flag = false ;
        //bot.reply(message,typing_on);
        bot.startConversation(message, (err, convo) => {
            convo.say('Hey! I am Deskie your cryptotrading assistant:)');
            //bot.reply(message2,typing_on);
            convo.say({
                attachment: {
                    'type':'template',
                    'payload':{
                        'template_type':'button',
                        'text':'Do you know how can I help you?',
                        'buttons':[
                            {
                                'type':'postback',
                                'title':'Yes!!',
                                'payload':'yes!'
                            },
                            {
                                'type':'postback',
                                'title':'Know more',
                                'payload':'more'
                            }
                        ]
                    }
                }
            });
        });
        //bot.reply(message,typing_off);
        conversations[message.channel] = {
            status: CONVERSATION_STATUS_HELLO,
            coordinates: undefined,
            items: []
        };
    }
}); 



controller.hears(['yes!', 'si', 'yes'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_HELLO){
        bot.startConversation(message, (err, convo) => {
            

            convo.say('Cool! Say me what do you need');
            conversations[message.channel].status = CONVERSATION_STATUS_USUAL_USER;
            
        });
    }
});



controller.hears(['more'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_HELLO){
        bot.startConversation(message, (err, convo) => {
            convo.say({
                attachment: {
                    'type':'template',
                    'payload':{
                        'template_type':'button',
                        'text':'I can help you with any of this topics:',
                        'buttons':[
                            {
                                'type':'postback',
                                'title':'Summary',
                                'payload':'summary'
                            },
                            {
                                'type':'postback',
                                'title':'I want to buy/sell',
                                'payload':'trade'
                            },
                            {
                                'type':'postback',
                                'title':'See a crypto',
                                'payload':'crypto'
                            }/*,
                            {
                                'type':'postback',
                                'title':'Exit',
                                'payload':'bye'
                            } */
                        ]
                    }
                }
            });
            convo.say('In other cases, say me goodbye and I will shutup.');
            conversations[message.channel] = {
                status: CONVERSATION_STATUS_USUAL_USER,
                coordinates: undefined,
                items: []
            };
            
        });
    }
});


controller.hears(['summary','overview','resume'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_USUAL_USER){
        bot.startConversation(message,function(err,convo){


        convo.say('Today it has been an incredible day!');
        convo.say('You have:');

        let total = 0;

        for(var p = 0; p< crypto.length ;p++){

            total = crypto[p].amount*crypto[p].btc + total ;

            if(crypto[p]!=0){

                if(crypto[p].name == 'BTC'){

                    convo.say(crypto[p].amount + ' ' + crypto[p].name + ' (' + crypto[p].percentage + ') ');

                }
                else{

                    convo.say(crypto[p].amount + ' ' + crypto[p].name + ' (' + crypto[p].percentage + ') ');
                }

            }
        }

        convo.say('Total worth of your portfolio: ' + total + 'BTC');
        });
    }
});



controller.hears(['crypto'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_USUAL_USER){
        bot.startConversation(message, (err, convo) => {

            convo.say('What crypto do you want to see ?');
            convo.ask('Say the name of the crypto: f.i eth:',[
                  {
                    pattern: 'eth',
                    callback: function(response,convo) {
                      convo.say('Ethereum exchange');
                      convo.next();
                    }
                  },
                  {
                    pattern: 'btc',
                    callback: function(response,convo) {
                      convo.say('Bitcoin exchange');
                      // do something else...
                      convo.next();

                    }
                  },
                  {
                    pattern: 'xmr',
                    callback: function(response,convo) {
                      convo.say('Monero exchange');
                      // do something else...
                      convo.next();
                    }
                  },
                  {
                    default: true,
                    callback: function(response,convo) {
                      // just repeat the question
                      convo.repeat();
                      convo.next();
                    }
                  }
                ]);
             convo.say('Do you want to do more actions?');
            
        });
        conversations[message.channel] = {
            status: CONVERSATION_STATUS_HELLO,
            coordinates: undefined,
            items: []
        };
    }
});



controller.hears(['trade','buy','sell'], 'message_received', (bot, message) => {
    if(conversations[message.channel] && conversations[message.channel].status === CONVERSATION_STATUS_USUAL_USER){
        bot.startConversation(message, (err, convo) => {
            convo.ask({
                  
                    "text":"Do you want to buy or sell?",
                    "quick_replies":[
                      {
                        "content_type":"text",
                        "title":"Buy",
                        "payload":"buy",
                        "image_url":"http://bobmccarthy.com/wp-content/uploads/2013/03/buy-md.png"
                      },
                      {
                        "content_type":"text",
                        "title":"Sell",
                        "payload":"sell",
                        "image_url":"http://www.grangerford.com/assets/misc/5897/155941.jpg"
                      }
                    ]
            
            }, (response, convo2) => {
                conversations[message.channel].items.push(response.text);
                conversations[message.channel].status = CONVERSATION_TRADE;
                convo.next();
                console.log(response.text);
                if(response.text == "Buy"){
                    convo.say('estic dintre de compra');
                }
                else{
                    convo.say('estic dintre de venta');
                }
                convo.say('Do you want to do more actions?');
            });
            conversations[message.channel] = {
            status: CONVERSATION_STATUS_HELLO,
            coordinates: undefined,
            items: []
        };

        });
    }
});


controller.hears(['bye','exit','return','goodbye','^.*\\bno\\b.*$'], 'message_received', (bot, message) => {

    if(conversations[message.channel] && (conversations[message.channel].status === CONVERSATION_STATUS_USUAL_USER||conversations[message.channel].status === CONVERSATION_STATUS_HELLO)){
        bot.startConversation(message, (err, convo) => {

            convo.say('Goodbye! For more help remember than I am here!');
            
        });
        conversations[message.channel] = {
            status: CONVERSATION_STATUS_INIT,
            coordinates: undefined,
            items: []
        };
        flag = true;
    }
});


