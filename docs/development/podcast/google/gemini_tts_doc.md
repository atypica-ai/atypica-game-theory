# Auth
## Authenticating with this module

It's incredibly easy to get authenticated and start using Google's APIs. You can set your credentials on a global basis as well as on a per-API basis. See each individual API section below to see how you can auth on a per-API-basis. This is useful if you want to use different accounts for different Cloud services.

```js
var config = {
  projectId: 'grape-spaceship-123',
  keyFilename: '/path/to/keyfile.json'
};
```

### The `config` object

A `config` object is not required if you are in an environment which supports [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials). This could be your own development machine when using the [gcloud SDK](https://cloud.google.com/sdk) or within Google App Engine and Compute Engine. How you [set up Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) depends on where your code is running.

If this doesn't describe your environment, the `config` object expects the following properties:

1. One of the following:
  1. `credentials` object containing `client_email` and `private_key` properties.
  2. `keyFilename` path to a .json, .pem, or .p12 key file.
  3. `GOOGLE_APPLICATION_CREDENTIALS` environment variable with a full path to your key file.

2. `projectId`

  If you wish, you can set an environment variable (`GOOGLE_CLOUD_PROJECT`) in place of specifying this inline. Or, if you have provided a service account JSON key file as the `config.keyFilename` property explained above, your project ID will be detected automatically.

**Note**: When using a .pem or .p12 key file, `config.email` is also required.


[dev-console]: https://console.developers.google.com/project
[gce-how-to]: https://cloud.google.com/compute/docs/authentication#using

# API Intro
## Parameters
MODEL = "gemini-2.5-flash-tts"  # @param ["gemini-2.5-flash-tts", "gemini-2.5-pro-tts"]

VOICE = "Kore"  # @param ["Achernar", "Achird", "Algenib", "Algieba", "Alnilam", "Aoede", "Autonoe", "Callirrhoe", "Charon", "Despina", "Enceladus", "Erinome", "Fenrir", "Gacrux", "Iapetus", "Kore", "Laomedeia", "Leda", "Orus", "Puck", "Pulcherrima", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Sulafat", "Umbriel", "Vindemiatrix", "Zephyr", "Zubenelgenubi"]

LANGUAGE_CODE = "en-us"  # @param ["am-et", "ar-001", "ar-eg",  "az-az",  "be-by",  "bg-bg", "bn-bd", "ca-es", "ceb-ph", "cs-cz",  "da-dk",  "de-de",  "el-gr", "en-au", "en-gb", "en-in",  "en-us",  "es-es",  "es-419", "es-mx", "es-us", "et-ee", "eu-es",  "fa-ir",  "fi-fi",  "fil-ph", "fr-fr", "fr-ca", "gl-es", "gu-in",  "hi-in",  "hr-hr",  "ht-ht",  "hu-hu", "af-za", "hy-am", "id-id",  "is-is",  "it-it",  "he-il",  "ja-jp", "jv-jv", "ka-ge", "kn-in",  "ko-kr",  "kok-in", "la-va",  "lb-lu", "lo-la", "lt-lt", "lv-lv",  "mai-in", "mg-mg",  "mk-mk",  "ml-in", "mn-mn", "mr-in", "ms-my",  "my-mm",  "nb-no",  "ne-np",  "nl-nl", "nn-no", "or-in", "pa-in",  "pl-pl",  "ps-af",  "pt-br",  "pt-pt", "ro-ro", "ru-ru", "sd-in",  "si-lk",  "sk-sk",  "sl-si",  "sq-al", "sr-rs", "sv-se", "sw-ke",  "ta-in",  "te-in",  "th-th",  "tr-tr", "uk-ua", "ur-pk", "vi-vn",  "cmn-cn", "cmn-tw"]

audioConfig = "MP3" # @param [ALAW,MULAW,MP3,OGG_OPUS,PCM]
## CURL Sample
```
# Make sure to install gcloud cli, and sign in to your project.
# Make sure to use your PROJECT_ID value.
# Currently, the available models are gemini-2.5-flash-preview-tts and gemini-2.5-pro-preview-tts
# To parse the JSON output and use it directly see the last line of the command.
# Requires JQ and ffplay library to be installed.
PROJECT_ID=YOUR_PROJECT_ID
curl -X POST \
-H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
-H "x-goog-user-project: $PROJECT_ID" \
-H "Content-Type: application/json" \
-d '{
"input": {
  "prompt": "Say the following in a curious way",
  "text": "OK, so... tell me about this [uhm] AI thing."
},
"voice": {
  "languageCode": "en-us",
  "name": "Kore",
  "model_name": "gemini-2.5-flash-preview-tts"
},
"audioConfig": {
  "audioEncoding": "LINEAR16"
}
}' \
"https://texttospeech.googleapis.com/v1/text:synthesize" \
| jq -r '.audioContent' | base64 -d | ffplay - -autoexit
```
# Samples using @google-cloud/text-to-speech
**be aware that all following samples are in JS, if using TS please only refer to the functions and logic used.**
## Quickstart
```
'use strict';

function main() {
  // [START tts_quickstart]
  // Imports the Google Cloud client library
  const textToSpeech = require('@google-cloud/text-to-speech');

  // Import other required libraries
  const fs = require('fs');
  const util = require('util');
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();
  async function quickStart() {
    // The text to synthesize
    const text = 'hello, world!';

    // Construct the request
    const request = {
      input: {text: text},
      // Select the language and SSML voice gender (optional)
      voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
      // select the type of audio encoding
      audioConfig: {audioEncoding: 'MP3'},
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile('output.mp3', response.audioContent, 'binary');
    console.log('Audio content written to file: output.mp3');
  }
  quickStart();
  // [END tts_quickstart]
}

main(...process.argv.slice(2));
```
## Synthesize Audio
```
'use strict';

function main(input, voice, audioConfig) {
  // [START texttospeech_v1_generated_TextToSpeech_SynthesizeSpeech_async]
  /**
   * This snippet has been automatically generated and should be regarded as a code template only.
   * It will require modifications to work.
   * It may require correct/in-range values for request initialization.
   * TODO(developer): Uncomment these variables before running the sample.
   */
  /**
   *  Required. The Synthesizer requires either plain text or SSML as input.
   */
  // const input = {}
  /**
   *  Required. The desired voice of the synthesized audio.
   */
  // const voice = {}
  /**
   *  Required. The configuration of the synthesized audio.
   */
  // const audioConfig = {}
  /**
   *  Advanced voice options.
   */
  // const advancedVoiceOptions = {}

  // Imports the Texttospeech library
  const {TextToSpeechClient} = require('@google-cloud/text-to-speech').v1;

  // Instantiates a client
  const texttospeechClient = new TextToSpeechClient();

  async function callSynthesizeSpeech() {
    // Construct request
    const request = {
      input,
      voice,
      audioConfig,
    };

    // Run request
    const response = await texttospeechClient.synthesizeSpeech(request);
    console.log(response);
  }

  callSynthesizeSpeech();
  // [END texttospeech_v1_generated_TextToSpeech_SynthesizeSpeech_async]
}

process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});
main(...process.argv.slice(2));
```
## Synthesize Long text Audio
```
'use strict';

function main(input, audioConfig, outputGcsUri, voice) {
  // [START texttospeech_v1beta1_generated_TextToSpeechLongAudioSynthesize_SynthesizeLongAudio_async]
  /**
   * This snippet has been automatically generated and should be regarded as a code template only.
   * It will require modifications to work.
   * It may require correct/in-range values for request initialization.
   * TODO(developer): Uncomment these variables before running the sample.
   */
  /**
   *  The resource states of the request in the form of
   *  `projects/* /locations/*`.
   */
  // const parent = 'abc123'
  /**
   *  Required. The Synthesizer requires either plain text or SSML as input.
   */
  // const input = {}
  /**
   *  Required. The configuration of the synthesized audio.
   */
  // const audioConfig = {}
  /**
   *  Required. Specifies a Cloud Storage URI for the synthesis results. Must be
   *  specified in the format: `gs://bucket_name/object_name`, and the bucket
   *  must already exist.
   */
  // const outputGcsUri = 'abc123'
  /**
   *  Required. The desired voice of the synthesized audio.
   */
  // const voice = {}

  // Imports the Texttospeech library
  const {TextToSpeechLongAudioSynthesizeClient} = require('@google-cloud/text-to-speech').v1beta1;

  // Instantiates a client
  const texttospeechClient = new TextToSpeechLongAudioSynthesizeClient();

  async function callSynthesizeLongAudio() {
    // Construct request
    const request = {
      input,
      audioConfig,
      outputGcsUri,
      voice,
    };

    // Run request
    const [operation] = await texttospeechClient.synthesizeLongAudio(request);
    const [response] = await operation.promise();
    console.log(response);
  }

  callSynthesizeLongAudio();
  // [END texttospeech_v1beta1_generated_TextToSpeechLongAudioSynthesize_SynthesizeLongAudio_async]
}

process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});
main(...process.argv.slice(2));
```