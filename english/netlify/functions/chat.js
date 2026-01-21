const https = require('https');

// System prompt for English teaching
const SYSTEM_PROMPT = `You are a professional English AI teaching assistant. Users can only ask questions in English. Your tasks are:

1. Provide detailed, helpful English learning content (vocabulary, grammar, writing, pronunciation, etc.)
2. Give specific example sentences and usage scenarios
3. Provide complete Chinese translation
4. Use encouraging and educational tone
5. If asked about vocabulary meaning, provide definition, usage and examples
6. If asked about grammar, clearly explain rules with examples
7. If asked about writing, give structured guidance
8. Responses should be comprehensive but concise

Please reply in the following format:
[English response content with detailed explanations and examples]

Then add at the end:
<div class="translation">[Corresponding Chinese translation]</div>

Remember: Users can only ask questions in English, you must reply in both Chinese and English to help users learn English better! Focus on practicality and educational value.`;

exports.handler = async (event, context) => {
  console.log('=== DeepSeek API Function Called ===');
  
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Method Not Allowed'
      })
    };
  }

  try {
    const { message } = JSON.parse(event.body || '{}');
    
    if (!message || message.trim() === '') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Message is required' 
        })
      };
    }

    // Get API key from environment variable
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not set in environment variables');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Server configuration error' 
        })
      };
    }

    // Call DeepSeek API
    const deepseekResponse = await callDeepSeekAPI(apiKey, message);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(deepseekResponse)
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

function callDeepSeekAPI(apiKey, userMessage) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1200,
      temperature: 0.7,
      stream: false
    });

    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`API returned status ${res.statusCode}`));
            return;
          }
          
          const jsonData = JSON.parse(data);
          
          if (!jsonData.choices || !jsonData.choices[0] || !jsonData.choices[0].message) {
            reject(new Error('Invalid response format'));
            return;
          }
          
          const aiContent = jsonData.choices[0].message.content;
          
          // Extract translation
          let englishPart = aiContent;
          let chinesePart = "中文翻译未能正确提取，请查看英文回复内容。";
          
          if (aiContent.includes('<div class="translation">')) {
            const parts = aiContent.split('<div class="translation">');
            englishPart = parts[0].trim();
            chinesePart = parts[1].replace('</div>', '').trim();
          } else {
            const lines = aiContent.split('\n');
            if (lines.length > 1) {
              englishPart = lines.slice(0, -1).join('\n').trim();
              chinesePart = lines[lines.length - 1].trim();
            }
          }
          
          resolve({
            text: englishPart,
            translation: chinesePart,
            success: true
          });
          
        } catch (parseError) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}