const axios = require('axios');

const languageVoiceMap = {
  'hi': { voiceId: 'hi-IN-ayushi', style: 'Conversational' }, //{"voice_id":"hi-IN-ayushi","style":"Conversational"}
  'es': { voiceId: 'es-ES-elvira', style: 'Conversational' }, //{"voice_id":"es-ES-elvira","style":"Conversational"}
  'fr': { voiceId: 'fr-FR-adélie', style: 'Conversational' }, //{"voice_id":"fr-FR-adélie","style":"Conversational"}
  'de': { voiceId: 'de-DE-matthias', style: 'Conversational' } //{"voice_id":"de-DE-matthias","style":"Conversational"}
};

async function translateAndSynthesize(summaryText, targetLanguage) {
  const selectedVoice = languageVoiceMap[targetLanguage];
  if (!selectedVoice) {
    throw new Error('Unsupported language');
  }
  console.log(`1. Translating to ${targetLanguage} with voice ${selectedVoice.voiceId}`);

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const MURF_API_KEY = process.env.MURF_API_KEY;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const translationPrompt = `
    You are an expert translator...
    CRITICAL RULE: Keep common English technical terms... in their original English form.
    Now, translate the following text to ${targetLanguage}:\n\n${summaryText}
  `;

  const translationResponse = await axios.post(geminiUrl, {
    contents: [{ parts: [{ text: translationPrompt }] }],
  });
  const translatedText = translationResponse.data.candidates[0].content.parts[0].text;

  console.log('2. Generating translated voice...');
  const murfUrl = "https://api.murf.ai/v1/speech/generate";
  const murfResp = await axios.post(
    murfUrl,
    {
      text: translatedText,
      voiceId: selectedVoice.voiceId,
      style: selectedVoice.style,
      format: "mp3",
      sampleRate: 44100,
    },
    {
      headers: { "api-key": MURF_API_KEY, "Content-Type": "application/json" }
    }
  );

  const audioUrl = murfResp.data.audioUrl || murfResp.data.audioFile || null;

  return { translatedText, audioUrl };
}

module.exports = {
  translateAndSynthesize
};