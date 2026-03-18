const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 飞书多维表格配置
const BITABLE_TOKEN = 'K1jpb8uNuaiM6nsQEpAc3eTynld';
const USER_OPEN_ID = 'ou_421fe6bbbdeb3a1e16ece556dd456b27';

// 数据表ID映射
const TABLE_IDS = {
  users: 'tbliLCCgWaUUIunk',
  healthRecords: 'tbltJXvvBpxv84S8',
  metrics: 'tblxpWRIV084miBh',
  meals: 'tblYlEKJhVXBFKb2',
  medications: 'tblR4lONwVj9Tvjb',
  chatHistory: 'tblQkgpXnaRu7JuN'
};

// API基础配置
const API_BASE = 'https://open.feishu.cn/open-apis/bitable/v1';
const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.FEISHU_TOKEN || ''}`,
  'Content-Type': 'application/json'
});

// 首页
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>健康管理系统</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { 
          color: white; 
          text-align: center; 
          margin-bottom: 30px;
          font-size: 2rem;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .card h2 { 
          color: #333; 
          margin-bottom: 16px;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat {
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-num { font-size: 2rem; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; font-size: 0.9rem; }
        
        .form-group { margin-bottom: 16px; }
        label { display: block; margin-bottom: 6px; color: #555; font-weight: 500; }
        input, select, textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e4e8ec;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .tab {
          padding: 10px 20px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .tab.active {
          background: white;
          color: #667eea;
        }
        
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        .record-item {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border-left: 4px solid #667eea;
        }
        .record-item .time {
          color: #999;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }
        .record-item .value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
        }
        
        .empty {
          text-align: center;
          color: #999;
          padding: 40px;
        }
        
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transform: translateX(400px);
          transition: transform 0.3s;
          z-index: 1000;
        }
        .toast.show { transform: translateX(0); }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏥 健康管理系统</h1>
        
        <div class="card">
          <div class="stats">
            <div class="stat">
              <div class="stat-num" id="recordCount">-</div>
              <div class="stat-label">健康档案</div>
            </div>
            <div class="stat">
              <div class="stat-num" id="metricCount">-</div>
              <div class="stat-label">指标记录</div>
            </div>
            <div class="stat">
              <div class="stat-num" id="medCount">-</div>
              <div class="stat-label">用药记录</div>
            </div>
          </div>
        </div>
        
        <div class="tabs">
          <button class="tab active" onclick="switchTab('records')">📋 健康档案</button>
          <button class="tab" onclick="switchTab('metrics')">📊 健康指标</button>
          <button class="tab" onclick="switchTab('meds')">💊 用药记录</button>
          <button class="tab" onclick="switchTab('meals')">🍽️ 饮食记录</button>
        </div>
        
        <!-- 健康档案 -->
        <div id="records" class="tab-content active">
          <div class="card">
            <h2>➕ 添加健康档案</h2>
            <form id="recordForm">
              <div class="form-group">
                <label>记录类型</label>
                <select id="recordType" required>
                  <option value="病历">病历</option>
                  <option value="体检">体检</option>
                  <option value="检查">检查</option>
                </select>
              </div>
              <div class="form-group">
                <label>标题</label>
                <input type="text" id="recordTitle" placeholder="如：2024年度体检" required>
              </div>
              <div class="form-group">
                <label>内容描述</label>
                <textarea id="recordContent" rows="3" placeholder="详细描述..."></textarea>
              </div>
              <div class="form-group">
                <label>医院/机构</label>
                <input type="text" id="recordHospital" placeholder="如：某某医院">
              </div>
              <div class="form-group">
                <label>医生</label>
                <input type="text" id="recordDoctor" placeholder="主治医生姓名">
              </div>
              <div class="form-group">
                <label>就诊日期</label>
                <input type="date" id="recordDate">
              </div>
              <div class="form-group">
                <label>标签</label>
                <select id="recordTags" multiple style="height: 100px;">
                  <option value="慢性病">慢性病</option>
                  <option value="复查">复查</option>
                  <option value="重要">重要</option>
                  <option value="手术">手术</option>
                </select>
              </div>
              <button type="submit">保存</button>
            </form>
          </div>
          <div id="recordsList"></div>
        </div>
        
        <!-- 健康指标 -->
        <div id="metrics" class="tab-content">
          <div class="card">
            <h2>📈 记录健康指标</h2>
            <form id="metricForm">
              <div class="form-group">
                <label>指标类型</label>
                <select id="metricType" required>
                  <option value="血压-收缩压">血压-收缩压</option>
                  <option value="血压-舒张压">血压-舒张压</option>
                  <option value="血糖">血糖</option>
                  <option value="体重">体重</option>
                  <option value="心率">心率</option>
                  <option value="体温">体温</option>
                  <option value="血氧">血氧</option>
                </select>
              </div>
              <div class="form-group">
                <label>数值</label>
                <input type="number" step="0.1" id="metricValue" placeholder="如：120" required>
              </div>
              <div class="form-group">
                <label>单位</label>
                <input type="text" id="metricUnit" placeholder="如：mmHg、kg、bpm">
              </div>
              <div class="form-group">
                <label>备注</label>
                <input type="text" id="metricNote" placeholder="可选备注">
              </div>
              <button type="submit">记录</button>
            </form>
          </div>
          <div id="metricsList"></div>
        </div>
        
        <!-- 用药记录 -->
        <div id="meds" class="tab-content">
          <div class="card">
            <h2>💊 添加用药</h2>
            <form id="medForm">
              <div class="form-group">
                <label>药名</label>
                <input type="text" id="medName" placeholder="药品名称" required>
              </div>
              <div class="form-group">
                <label>剂量</label>
                <input type="text" id="medDosage" placeholder="如：50mg" required>
              </div>
              <div class="form-group">
                <label>频次</label>
                <select id="medFreq" required>
                  <option value="每日1次">每日1次</option>
                  <option value="每日2次">每日2次</option>
                  <option value="每日3次">每日3次</option>
                  <option value="每日4次">每日4次</option>
                  <option value="每周1次">每周1次</option>
                  <option value="按需服用">按需服用</option>
                </select>
              </div>
              <div class="form-group">
                <label>开始日期</label>
                <input type="date" id="medStart" required>
              </div>
              <div class="form-group">
                <label>结束日期（可选）</label>
                <input type="date" id="medEnd">
              </div>
              <div class="form-group">
                <label>备注</label>
                <input type="text" id="medNote" placeholder="可选备注">
              </div>
              <button type="submit">添加用药</button>
            </form>
          </div>
          <div id="medsList"></div>
        </div>
        
        <!-- 饮食记录 -->
        <div id="meals" class="tab-content">
          <div class="card">
            <h2>🍽️ 记录饮食</h2>
            <form id="mealForm">
              <div class="form-group">
                <label>餐别</label>
                <select id="mealType" required>
                  <option value="早餐">早餐</option>
                  <option value="午餐">午餐</option>
                  <option value="晚餐">晚餐</option>
                  <option value="加餐">加餐</option>
                </select>
              </div>
              <div class="form-group">
                <label>食物描述</label>
                <textarea id="mealContent" rows="2" placeholder="吃了什么？"></textarea>
              </div>
              <div class="form-group">
                <label>卡路里（可选）</label>
                <input type="number" id="mealCal" placeholder="kcal">
              </div>
              <div class="form-group">
                <label>用餐日期</label>
                <input type="date" id="mealDate" required>
              </div>
              <button type="submit">记录</button>
            </form>
          </div>
          <div id="mealsList"></div>
        </div>
      </div>
      
      <div id="toast" class="toast">保存成功！</div>
      
      <script>
        const API = '';
        
        // 切换标签页
        function switchTab(tabId) {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          event.target.classList.add('active');
          document.getElementById(tabId).classList.add('active');
        }
        
        // 显示提示
        function showToast(msg) {
          const toast = document.getElementById('toast');
          toast.textContent = msg;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
        
        // 加载数据
        async function loadData() {
          try {
            // 模拟数据（实际需要飞书API）
            const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
            const metrics = JSON.parse(localStorage.getItem('metrics') || '[]');
            const meds = JSON.parse(localStorage.getItem('medications') || '[]');
            const meals = JSON.parse(localStorage.getItem('meals') || '[]');
            
            document.getElementById('recordCount').textContent = records.length;
            document.getElementById('metricCount').textContent = metrics.length;
            document.getElementById('medCount').textContent = meds.length;
            
            renderRecords(records);
            renderMetrics(metrics);
            renderMeds(meds);
            renderMeals(meals);
          } catch(e) {
            console.error(e);
          }
        }
        
        function renderRecords(records) {
          const el = document.getElementById('recordsList');
          if (!records.length) {
            el.innerHTML = '<div class="empty">暂无健康档案，点击上方添加</div>';
            return;
          }
          el.innerHTML = records.map(r => \`
            <div class="card record-item">
              <div class="time">\${r.date || ''}</div>
              <div><strong>\${r.type}</strong> - \${r.title}</div>
              <div style="color:#666;margin-top:8px;">\${r.content || ''}</div>
            </div>
          \`).join('');
        }
        
        function renderMetrics(metrics) {
          const el = document.getElementById('metricsList');
          if (!metrics.length) {
            el.innerHTML = '<div class="empty">暂无指标记录</div>';
            return;
          }
          el.innerHTML = metrics.slice(-5).reverse().map(m => \`
            <div class="card record-item">
              <div class="time">\${m.time || ''}</div>
              <div class="value">\${m.value} \${m.unit}</div>
              <div style="color:#666;">\${m.type}</div>
            </div>
          \`).join('');
        }
        
        function renderMeds(meds) {
          const el = document.getElementById('medsList');
          if (!meds.length) {
            el.innerHTML = '<div class="empty">暂无用药记录</div>';
            return;
          }
          el.innerHTML = meds.map(m => \`
            <div class="card record-item">
              <div><strong>\${m.name}</strong> - \${m.dosage}</div>
              <div style="color:#666;">\${m.frequency}</div>
              <div class="time">\${m.start} ~ \${m.end || '进行中'}</div>
            </div>
          \`).join('');
        }
        
        function renderMeals(meals) {
          const el = document.getElementById('mealsList');
          if (!meals.length) {
            el.innerHTML = '<div class="empty">暂无饮食记录</div>';
            return;
          }
          el.innerHTML = meals.slice(-5).reverse().map(m => \`
            <div class="card record-item">
              <div class="time">\${m.date}</div>
              <div><strong>\${m.type}</strong></div>
              <div style="color:#666;">\${m.content}</div>
            </div>
          \`).join('');
        }
        
        // 表单提交
        document.getElementById('recordForm').onsubmit = function(e) {
          e.preventDefault();
          const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
          records.push({
            type: document.getElementById('recordType').value,
            title: document.getElementById('recordTitle').value,
            content: document.getElementById('recordContent').value,
            hospital: document.getElementById('recordHospital').value,
            doctor: document.getElementById('recordDoctor').value,
            date: document.getElementById('recordDate').value,
            tags: Array.from(document.getElementById('recordTags').selectedOptions).map(o => o.value)
          });
          localStorage.setItem('healthRecords', JSON.stringify(records));
          loadData();
          this.reset();
          showToast('健康档案已保存！');
        };
        
        document.getElementById('metricForm').onsubmit = function(e) {
          e.preventDefault();
          const metrics = JSON.parse(localStorage.getItem('metrics') || '[]');
          metrics.push({
            type: document.getElementById('metricType').value,
            value: document.getElementById('metricValue').value,
            unit: document.getElementById('metricUnit').value,
            note: document.getElementById('metricNote').value,
            time: new Date().toLocaleString()
          });
          localStorage.setItem('metrics', JSON.stringify(metrics));
          loadData();
          this.reset();
          showToast('指标已记录！');
        };
        
        document.getElementById('medForm').onsubmit = function(e) {
          e.preventDefault();
          const meds = JSON.parse(localStorage.getItem('medications') || '[]');
          meds.push({
            name: document.getElementById('medName').value,
            dosage: document.getElementById('medDosage').value,
            frequency: document.getElementById('medFreq').value,
            start: document.getElementById('medStart').value,
            end: document.getElementById('medEnd').value,
            note: document.getElementById('medNote').value
          });
          localStorage.setItem('medications', JSON.stringify(meds));
          loadData();
          this.reset();
          showToast('用药已添加！');
        };
        
        document.getElementById('mealForm').onsubmit = function(e) {
          e.preventDefault();
          const meals = JSON.parse(localStorage.getItem('meals') || '[]');
          meals.push({
            type: document.getElementById('mealType').value,
            content: document.getElementById('mealContent').value,
            calories: document.getElementById('mealCal').value,
            date: document.getElementById('mealDate').value
          });
          localStorage.setItem('meals', JSON.stringify(meals));
          loadData();
          this.reset();
          showToast('饮食已记录！');
        };
        
        // 初始化
        loadData();
      </script>
    </body>
    </html>
  `);
});

// API路由 - 获取所有记录
app.get('/api/:type', (req, res) => {
  const { type } = req.params;
  // 这里暂时返回本地存储的数据
  // 实际需要调用飞书API
  res.json({ success: true, data: [] });
});

// API路由 - 添加记录
app.post('/api/:type', (req, res) => {
  const { type } = req.params;
  const data = req.body;
  console.log(`[${type}] 添加: `, data);
  res.json({ success: true, message: '已保存' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏥 健康管理系统 running at http://localhost:${PORT}`);
});
