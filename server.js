const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

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
    h1 { color: white; text-align: center; margin-bottom: 30px; font-size: 2rem; }
    
    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .card h2 { color: #333; margin-bottom: 16px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat {
      background: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .stat-num { font-size: 2rem; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; font-size: 0.85rem; }
    
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
      font-size: 0.9rem;
    }
    .tab.active { background: white; color: #667eea; }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* 标签复选框样式 */
    .tag-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag-checkbox { display: none; }
    .tag-label {
      padding: 6px 14px;
      background: #f0f0f0;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .tag-checkbox:checked + .tag-label {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    
    /* 图片上传样式 */
    .upload-area {
      border: 2px dashed #ddd;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }
    .upload-area:hover { border-color: #667eea; background: #f8f9ff; }
    .upload-area input { display: none; }
    .upload-preview {
      max-width: 100%;
      max-height: 150px;
      border-radius: 8px;
      margin-top: 10px;
      display: none;
    }
    .upload-preview.show { display: block; }
    
    .record-item {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
      border-left: 4px solid #667eea;
    }
    .record-item .time { color: #999; font-size: 0.85rem; margin-bottom: 8px; }
    .record-item .value { font-size: 1.5rem; font-weight: bold; color: #333; }
    .record-item img { max-width: 200px; border-radius: 8px; margin-top: 8px; }
    
    .empty { text-align: center; color: #999; padding: 40px; }
    
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
    
    /* AI对话区域 */
    .ai-section {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      border-radius: 16px;
      padding: 20px;
      margin-top: 20px;
    }
    .ai-section h2 { color: white !important; }
    .ai-messages {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
    }
    .ai-msg { margin-bottom: 12px; padding: 10px; border-radius: 8px; }
    .ai-msg.user { background: #667eea; text-align: right; margin-left: 40px; }
    .ai-msg.assistant { background: rgba(255,255,255,0.2); margin-right: 40px; }
    .ai-input-group { display: flex; gap: 10px; }
    .ai-input-group input { flex: 1; }
    .ai-input-group button { width: auto; padding: 12px 24px; }
    
    .record-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .record-tag {
      padding: 4px 10px;
      background: #667eea;
      color: white;
      border-radius: 12px;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 健康管理系统</h1>
    
    <div class="card">
      <div class="stats">
        <div class="stat">
          <div class="stat-num" id="recordCount">0</div>
          <div class="stat-label">健康档案</div>
        </div>
        <div class="stat">
          <div class="stat-num" id="metricCount">0</div>
          <div class="stat-label">指标记录</div>
        </div>
        <div class="stat">
          <div class="stat-num" id="medCount">0</div>
          <div class="stat-label">用药记录</div>
        </div>
        <div class="stat">
          <div class="stat-num" id="mealCount">0</div>
          <div class="stat-label">饮食记录</div>
        </div>
      </div>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('records')">📋 健康档案</button>
      <button class="tab" onclick="switchTab('metrics')">📊 健康指标</button>
      <button class="tab" onclick="switchTab('meds')">💊 用药记录</button>
      <button class="tab" onclick="switchTab('meals')">🍽️ 饮食记录</button>
      <button class="tab" onclick="switchTab('ai')">🤖 AI健康助手</button>
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
              <option value="处方">处方</option>
              <option value="报告">报告</option>
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
            <label>标签（可多选）</label>
            <div class="tag-group">
              <input type="checkbox" id="tag1" value="慢性病" class="tag-checkbox">
              <label for="tag1" class="tag-label">慢性病</label>
              <input type="checkbox" id="tag2" value="复查" class="tag-checkbox">
              <label for="tag2" class="tag-label">复查</label>
              <input type="checkbox" id="tag3" value="重要" class="tag-checkbox">
              <label for="tag3" class="tag-label">重要</label>
              <input type="checkbox" id="tag4" value="手术" class="tag-checkbox">
              <label for="tag4" class="tag-label">手术</label>
              <input type="checkbox" id="tag5" value="急诊" class="tag-checkbox">
              <label for="tag5" class="tag-label">急诊</label>
              <input type="checkbox" id="tag6" value="住院" class="tag-checkbox">
              <label for="tag6" class="tag-label">住院</label>
            </div>
          </div>
          <div class="form-group">
            <label>上传图片（检查单/病历/报告）</label>
            <div class="upload-area" onclick="document.getElementById('recordImage').click()">
              <span>📷 点击上传图片</span>
              <input type="file" id="recordImage" accept="image/*" onchange="previewImage(this, 'recordPreview')">
              <img id="recordPreview" class="upload-preview">
            </div>
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
              <option value="血压-收缩压">血压-收缩压(mmHg)</option>
              <option value="血压-舒张压">血压-舒张压(mmHg)</option>
              <option value="血糖-空腹">血糖-空腹</option>
              <option value="血糖-餐后">血糖-餐后</option>
              <option value="体重">体重(kg)</option>
              <option value="身高">身高(cm)</option>
              <option value="心率">心率(bpm)</option>
              <option value="体温">体温(℃)</option>
              <option value="血氧">血氧(%)</option>
              <option value="胆固醇">胆固醇</option>
              <option value="尿酸">尿酸</option>
            </select>
          </div>
          <div class="form-group">
            <label>数值</label>
            <input type="number" step="0.1" id="metricValue" placeholder="如：120" required>
          </div>
          <div class="form-group">
            <label>备注</label>
            <input type="text" id="metricNote" placeholder="可选备注">
          </div>
          <div class="form-group">
            <label>测量时间</label>
            <input type="datetime-local" id="metricTime">
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
          <div class="form-group">
            <label>上传处方图片</label>
            <div class="upload-area" onclick="document.getElementById('medImage').click()">
              <span>📷 点击上传处方</span>
              <input type="file" id="medImage" accept="image/*" onchange="previewImage(this, 'medPreview')">
              <img id="medPreview" class="upload-preview">
            </div>
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
          <div class="form-group">
            <label>上传照片</label>
            <div class="upload-area" onclick="document.getElementById('mealImage').click()">
              <span>📷 点击上传照片</span>
              <input type="file" id="mealImage" accept="image/*" onchange="previewImage(this, 'mealPreview')">
              <img id="mealPreview" class="upload-preview">
            </div>
          </div>
          <button type="submit">记录</button>
        </form>
      </div>
      <div id="mealsList"></div>
    </div>
    
    <!-- AI对话 -->
    <div id="ai" class="tab-content">
      <div class="card ai-section">
        <h2>🤖 AI健康助手</h2>
        <p style="color: #aaa; margin-bottom: 16px;">基于智谱GLM-4V-Flash，帮你分析健康数据、解读检查报告</p>
        <div class="ai-messages" id="aiMessages">
          <div class="ai-msg assistant">你好！我是你的AI健康助手。可以帮你：<br>📊 分析健康指标趋势<br>🔍 解读检查报告<br>💊 用药提醒<br>🍎 饮食建议<br>有什么健康问题尽管问我！</div>
        </div>
        <div class="ai-input-group">
          <input type="text" id="aiInput" placeholder="问我健康问题..." onkeypress="if(event.key==='Enter')sendAI()">
          <button onclick="sendAI()">发送</button>
        </div>
        <div class="upload-area" style="margin-top: 16px;" onclick="document.getElementById('aiImage').click()">
          <span>📷 上传检查报告/病历图片，AI帮你分析</span>
          <input type="file" id="aiImage" accept="image/*" onchange="handleAIImage(this)">
        </div>
      </div>
    </div>
  </div>
  
  <div id="toast" class="toast">保存成功！</div>
  
  <script>
    // 图片预览
    function previewImage(input, previewId) {
      const file = input.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById(previewId).src = e.target.result;
          document.getElementById(previewId).classList.add('show');
        };
        reader.readAsDataURL(file);
      }
    }
    
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
    
    // 获取选中的标签
    function getSelectedTags() {
      const tags = [];
      document.querySelectorAll('.tag-checkbox:checked').forEach(cb => tags.push(cb.value));
      return tags;
    }
    
    // 加载数据
    async function loadData() {
      try {
        const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
        const metrics = JSON.parse(localStorage.getItem('metrics') || '[]');
        const meds = JSON.parse(localStorage.getItem('medications') || '[]');
        const meals = JSON.parse(localStorage.getItem('meals') || '[]');
        
        document.getElementById('recordCount').textContent = records.length;
        document.getElementById('metricCount').textContent = metrics.length;
        document.getElementById('medCount').textContent = meds.length;
        document.getElementById('mealCount').textContent = meals.length;
        
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
      el.innerHTML = records.slice(-10).reverse().map(r => \`
        <div class="card record-item">
          <div class="time">\${r.date || ''}</div>
          <div><strong>\${r.type}</strong> - \${r.title}</div>
          <div style="color:#666;margin-top:8px;">\${r.content || ''}</div>
          \${r.tags && r.tags.length ? \`<div class="record-tags">\${r.tags.map(t => \`<span class="record-tag">\${t}</span>\`).join('')}</div>\` : ''}
          \${r.image ? \`<img src="\${r.image}">\` : ''}
        </div>
      \`).join('');
    }
    
    function renderMetrics(metrics) {
      const el = document.getElementById('metricsList');
      if (!metrics.length) {
        el.innerHTML = '<div class="empty">暂无指标记录</div>';
        return;
      }
      el.innerHTML = metrics.slice(-10).reverse().map(m => \`
        <div class="card record-item">
          <div class="time">\${m.time || ''}</div>
          <div class="value">\${m.value}</div>
          <div style="color:#666;">\${m.type}</div>
          \${m.note ? \`<div style="color:#999;font-size:0.85rem;">\${m.note}</div>\` : ''}
        </div>
      \`).join('');
    }
    
    function renderMeds(meds) {
      const el = document.getElementById('medsList');
      if (!meds.length) {
        el.innerHTML = '<div class="empty">暂无用药记录</div>';
        return;
      }
      el.innerHTML = meds.slice(-10).reverse().map(m => \`
        <div class="card record-item">
          <div><strong>\${m.name}</strong> - \${m.dosage}</div>
          <div style="color:#666;">\${m.frequency}</div>
          <div class="time">\${m.start} ~ \${m.end || '进行中'}</div>
          \${m.image ? \`<img src="\${m.image}">\` : ''}
        </div>
      \`).join('');
    }
    
    function renderMeals(meals) {
      const el = document.getElementById('mealsList');
      if (!meals.length) {
        el.innerHTML = '<div class="empty">暂无饮食记录</div>';
        return;
      }
      el.innerHTML = meals.slice(-10).reverse().map(m => \`
        <div class="card record-item">
          <div class="time">\${m.date}</div>
          <div><strong>\${m.type}</strong></div>
          <div style="color:#666;">\${m.content}</div>
          \${m.calories ? \`<div style="color:#999;">\${m.calories} kcal</div>\` : ''}
          \${m.image ? \`<img src="\${m.image}">\` : ''}
        </div>
      \`).join('');
    }
    
    // 表单提交 - 健康档案
    document.getElementById('recordForm').onsubmit = async function(e) {
      e.preventDefault();
      const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
      
      // 获取图片base64
      const imageFile = document.getElementById('recordImage').files[0];
      let imageBase64 = '';
      if (imageFile) {
        imageBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(imageFile);
        });
      }
      
      records.push({
        type: document.getElementById('recordType').value,
        title: document.getElementById('recordTitle').value,
        content: document.getElementById('recordContent').value,
        hospital: document.getElementById('recordHospital').value,
        doctor: document.getElementById('recordDoctor').value,
        date: document.getElementById('recordDate').value,
        tags: getSelectedTags(),
        image: imageBase64,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('healthRecords', JSON.stringify(records));
      loadData();
      this.reset();
      document.querySelectorAll('.tag-checkbox').forEach(cb => cb.checked = false);
      document.getElementById('recordPreview').classList.remove('show');
      showToast('健康档案已保存！');
    };
    
    // 表单提交 - 健康指标
    document.getElementById('metricForm').onsubmit = async function(e) {
      e.preventDefault();
      const metrics = JSON.parse(localStorage.getItem('metrics') || '[]');
      metrics.push({
        type: document.getElementById('metricType').value,
        value: document.getElementById('metricValue').value,
        note: document.getElementById('metricNote').value,
        time: document.getElementById('metricTime').value || new Date().toLocaleString()
      });
      localStorage.setItem('metrics', JSON.stringify(metrics));
      loadData();
      this.reset();
      showToast('指标已记录！');
    };
    
    // 表单提交 - 用药记录
    document.getElementById('medForm').onsubmit = async function(e) {
      e.preventDefault();
      const meds = JSON.parse(localStorage.getItem('medications') || '[]');
      
      const imageFile = document.getElementById('medImage').files[0];
      let imageBase64 = '';
      if (imageFile) {
        imageBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(imageFile);
        });
      }
      
      meds.push({
        name: document.getElementById('medName').value,
        dosage: document.getElementById('medDosage').value,
        frequency: document.getElementById('medFreq').value,
        start: document.getElementById('medStart').value,
        end: document.getElementById('medEnd').value,
        note: document.getElementById('medNote').value,
        image: imageBase64
      });
      localStorage.setItem('medications', JSON.stringify(meds));
      loadData();
      this.reset();
      document.getElementById('medPreview').classList.remove('show');
      showToast('用药已添加！');
    };
    
    // 表单提交 - 饮食记录
    document.getElementById('mealForm').onsubmit = async function(e) {
      e.preventDefault();
      const meals = JSON.parse(localStorage.getItem('meals') || '[]');
      
      const imageFile = document.getElementById('mealImage').files[0];
      let imageBase64 = '';
      if (imageFile) {
        imageBase64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(imageFile);
        });
      }
      
      meals.push({
        type: document.getElementById('mealType').value,
        content: document.getElementById('mealContent').value,
        calories: document.getElementById('mealCal').value,
        date: document.getElementById('mealDate').value,
        image: imageBase64
      });
      localStorage.setItem('meals', JSON.stringify(meals));
      loadData();
      this.reset();
      document.getElementById('mealPreview').classList.remove('show');
      showToast('饮食已记录！');
    };
    
    // AI对话
    async function sendAI() {
      const input = document.getElementById('aiInput');
      const msg = input.value.trim();
      if (!msg) return;
      
      const msgs = document.getElementById('aiMessages');
      msgs.innerHTML += \`<div class="ai-msg user">\${msg}</div>\`;
      msgs.innerHTML += \`<div class="ai-msg assistant">正在思考...</div>\`;
      msgs.scrollTop = msgs.scrollHeight;
      input.value = '';
      
      // 模拟AI回复（实际需要接入智谱API）
      setTimeout(() => {
        const lastMsg = msgs.querySelector('.ai-msg.assistant:last-child');
        lastMsg.textContent = '感谢你的提问！由于演示模式，AI对话功能需要配置智谱API Key后才能使用。你可以：\n\n1. 在健康档案中上传检查报告图片\n2. 我会保存你的健康数据\n3. 后续接入AI后可分析趋势\n\n要使用完整的AI功能，请配置API Key。';
        msgs.scrollTop = msgs.scrollHeight;
      }, 1000);
    }
    
    async function handleAIImage(input) {
      const file = input.files[0];
      if (!file) return;
      
      const msgs = document.getElementById('aiMessages');
      msgs.innerHTML += \`<div class="ai-msg user">上传了图片</div>\`;
      msgs.innerHTML += \`<div class="ai-msg assistant">图片已收到！由于演示模式，AI图像分析功能需要配置智谱API Key后才能使用。</div>\`;
      msgs.scrollTop = msgs.scrollHeight;
    }
    
    // 初始化
    loadData();
  </script>
</body>
</html>
  `);
});

// API路由
app.get('/api/:type', (req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/:type', (req, res) => {
  console.log(`[${req.params.type}] 添加: `, req.body);
  res.json({ success: true, message: '已保存' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏥 健康管理系统 running at http://localhost:${PORT}`);
});
