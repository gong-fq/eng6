// 最简单的测试函数，先确认能正常工作
exports.handler = async function(event, context) {
  console.log('收到请求:', event.httpMethod);
  
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  // 如果不是 POST 请求，返回错误
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false,
        error: '只允许 POST 请求' 
      })
    };
  }
  
  try {
    // 解析请求体
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false,
          error: '无效的 JSON 格式' 
        })
      };
    }
    
    const { message } = body;
    
    console.log('收到消息:', message);
    
    // 先返回一个测试响应
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        text: `这是测试响应：${message || '空消息'}`,
        translation: `This is a test response to: ${message || 'empty message'}`,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('处理请求时出错:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: '服务器内部错误',
        details: error.message
      })
    };
  }
};