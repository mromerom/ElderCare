const alexaSDK = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const promisify = require('es6-promisify');

const appId = 'amzn1.ask.skill.e0f29b9c-a3f1-418c-986e-cefdf9cc96d8';
// const appId = 'amzn1.ask.skill.7c1f4be8-63dc-4c06-ae39-86372c6d4fab';
const alertsTable = 'alertDailySummaries';
const docClient = new awsSDK.DynamoDB.DocumentClient();


// convert callback style functions to promises
const dbScan = promisify(docClient.scan, docClient);
const dbGet = promisify(docClient.get, docClient);
const dbPut = promisify(docClient.put, docClient);
const dbDelete = promisify(docClient.delete, docClient);

const instructions = `Welcome to Elder Care<break strength="medium" /> 
                      The following commands are available: get alert summary, get vital information. What 
                      would you like to do?`;

const handlers = {

    /**
     * Triggered when the user says "Alexa, open Elder Care."
     */
    'LaunchRequest'() {
        this.emit(':ask', instructions);
    },

    'GetHealthInfoIntent'() {
        const { slots } = this.event.request.intent;
        
        // prompt for slot data if needed
        if (!slots.Vital.value) {
            const slotToElicit = 'Vital';
            const speechOutput = 'What vital would you like to hear about?';
            const repromptSpeech = 'Please tell me the name of the vital.';
            return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        }
        
        const { userId } = this.event.request.user;
        const vitalName = slots.Vital.value;
        const dynamoParams = {
            TableName: alertsTable,
            Key: {
                Name: vitalName,
                UserId: userId
            }
        };

        console.log('Attempting to read data');

        // query DynamoDB
        dbGet(dynamoParams)
            .then(data => {
                // console.log('Get item succeeded', data);

                const vital = data.Item;

                if (vital) {
                    this.emit(':tell', `${vital.Pulse}.`);
                }
                else {
                    this.emit(':tell', `${vital.Name} not found!`);
                }
            })
            .catch(err => console.error(err));
    },

    'Unhandled'() {
        console.error('problem', this.event);
        this.emit(':ask', 'An unhandled problem occurred!');
    },

    'AMAZON.HelpIntent'() {
        const speechOutput = instructions;
        const reprompt = instructions;
        this.emit(':ask', speechOutput, reprompt);
    },

    'AMAZON.CancelIntent'() {
        this.emit(':tell', 'Goodbye!');
    },

    'AMAZON.StopIntent'() {
        this.emit(':tell', 'Goodbye!');
    }
};

exports.handler = function handler(event, context) {
    // console.log("===EVENT=== \n" + JSON.stringify(event));
    const alexa = alexaSDK.handler(event, context);
    alexa.APP_ID = appId;
    // alexa.dynamoDBTableName = 'alertDailySummaries';
    alexa.registerHandlers(handlers);
    alexa.execute();
};
