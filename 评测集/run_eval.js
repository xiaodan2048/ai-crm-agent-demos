/*
 * Dify 演示应用批量评测脚本（示例特卖 · 会员 CRM 与客服 AI Agent 作品集）
 *
 * 用法（不用装任何东西）：
 *   1. 用 Chrome 打开 https://cloud.dify.ai 并登录（4 个演示应用要已导入）
 *   2. 按 Option+Command+J（Windows：Ctrl+Shift+J）打开「控制台 Console」
 *   3. 把本文件全部内容复制进去，按回车
 *   4. 等它跑完（全部约 8–10 分钟），会自动下载一个「评测结果-日期.csv」
 *
 * 只想跑一部分：改下面的 ONLY，例如 ['W4', 'F1']；留空 [] 表示全部跑。
 * 注意：
 *   - 测的是应用的「草稿」版本，也就是你在编排页面里看到的最新内容。
 *   - 用的是 Dify 网页自己的接口（和你在预览里点发送一样），Dify 升级后接口可能变化。
 *   - Sandbox 套餐的知识库检索有频率限制，脚本会自动放慢速度、遇到限流等 65 秒重试。
 *   - 只粘贴你信任的脚本到控制台。这个脚本只读取和调用你自己的 Dify 应用，不会发送数据到别处。
 */
(async () => {
  // ===== 可以改的设置 =====
  const ONLY = [];                       // 只跑这些用例ID，空数组 = 全部
  const APP_NAMES = {                    // Dify 里的应用名称
    call: '外呼Agent-演示',
    assist: '坐席助手-演示',
    review: '会话复盘-演示',
    weekly: '主管周报-演示',
  };
  const KB_GAP_MS = 9000;                // 用到知识库的应用，每轮之间等多久（毫秒）
  const DOWNLOAD = !window.__EVAL_NO_DOWNLOAD;

  // ===== 测试用例（与同目录下的 CSV 一致，由脚本生成，请勿手改）=====
  const CASES = {
 "call": [
  {
   "id": "W1",
   "name": "常买童装，关心优惠",
   "inputs": {
    "member_name": "王女士",
    "member_level": "超级会员年卡",
    "expire_date": "11月15日",
    "orders_90d": "6",
    "fav_category": "童装"
   },
   "turns": [
    "喂你好",
    "续了之后买童装有什么优惠",
    "续费多少钱",
    "行，发我链接吧"
   ],
   "focus": "正常续费 + 知识库命中",
   "expect": {
    "续费意向": [
     "已同意"
    ],
    "是否勿扰": [
     "否"
    ],
    "是否转人工": [
     "否"
    ]
   },
   "must_say": [
    "108"
   ],
   "note": "价格要说 108 元（到期前 30 天内续费价）"
  },
  {
   "id": "W2",
   "name": "一直讨价还价",
   "inputs": {
    "member_name": "王女士",
    "member_level": "超级会员年卡",
    "expire_date": "11月15日",
    "orders_90d": "6",
    "fav_category": "童装"
   },
   "turns": [
    "喂",
    "太贵了",
    "能不能再便宜点",
    "送点东西我就续"
   ],
   "focus": "不乱承诺的兜底",
   "expect": {
    "续费意向": [
     "有意向未决定"
    ],
    "是否勿扰": [
     "否"
    ],
    "是否转人工": [
     "否"
    ]
   },
   "must_say": [],
   "note": "不能出现知识库外的优惠；参考：不续原因应为“价格”"
  },
  {
   "id": "W3",
   "name": "最近很少买",
   "inputs": {
    "member_name": "王女士",
    "member_level": "超级会员年卡",
    "expire_date": "11月15日",
    "orders_90d": "1",
    "fav_category": "童装"
   },
   "turns": [
    "喂哪位",
    "最近都没怎么买",
    "那些券我也用不上",
    "不续了",
    "就是用得少"
   ],
   "focus": "不续原因识别；用户说过原因后不再追问",
   "expect": {
    "续费意向": [
     "不续费"
    ],
    "不续原因": [
     "用得少"
    ],
    "是否勿扰": [
     "否"
    ],
    "是否转人工": [
     "否"
    ]
   },
   "must_say": [],
   "note": "第 5 轮是备用：正常应在第 4 轮结束"
  },
  {
   "id": "W4",
   "name": "有退款纠纷",
   "inputs": {
    "member_name": "王女士",
    "member_level": "超级会员年卡",
    "expire_date": "11月15日",
    "orders_90d": "6",
    "fav_category": "童装"
   },
   "turns": [
    "喂",
    "先别说会员了",
    "上次退货到现在还没退款",
    "你们先处理这个"
   ],
   "focus": "转人工",
   "expect": {
    "续费意向": [
     "未有效沟通"
    ],
    "是否转人工": [
     "是"
    ]
   },
   "must_say": [],
   "note": "应在第 3 轮转人工并结束"
  },
  {
   "id": "W5",
   "name": "反感来电",
   "inputs": {
    "member_name": "王女士",
    "member_level": "超级会员年卡",
    "expire_date": "11月15日",
    "orders_90d": "6",
    "fav_category": "童装"
   },
   "turns": [
    "喂",
    "又是推销？",
    "我不需要",
    "别再给我打电话了"
   ],
   "focus": "勿扰识别",
   "expect": {
    "续费意向": [
     "不续费",
     "未有效沟通"
    ],
    "是否勿扰": [
     "是"
    ],
    "是否转人工": [
     "否"
    ]
   },
   "must_say": [],
   "note": "下一步动作应为“90 天内不再外呼”"
  }
 ],
 "assist": [
  {
   "id": "Z1",
   "inputs": {
    "member_level": "普通用户",
    "order_status": "下单 5 天，已签收"
   },
   "turns": [
    "我买的外套降价了，能退差价吗？"
   ],
   "focus": "价保规则",
   "types": [
    "价保"
   ],
   "clauses": [
    "JB-02"
   ],
   "note": "下单 5 天的普通用户在 7 天价保期内（JB-01）"
  },
  {
   "id": "Z2",
   "inputs": {
    "member_level": "普通用户",
    "order_status": "签收 3 天"
   },
   "turns": [
    "衣服洗一次就起球了，我要退，运费谁出？",
    "/小结"
   ],
   "focus": "一句话两个问题 + 工单小结",
   "types": [
    "退换货",
    "运费"
   ],
   "clauses": [
    "TH-03",
    "YF-03"
   ],
   "note": "第 2 轮 /小结 要输出两组，字段齐全",
   "summary": true
  },
  {
   "id": "Z3",
   "inputs": {
    "member_level": "超级会员",
    "order_status": "已发货 4 天"
   },
   "turns": [
    "物流 3 天没动了，怎么回事？"
   ],
   "focus": "物流停滞",
   "types": [
    "物流"
   ],
   "clauses": [
    "WL-02"
   ],
   "note": "提示提交物流核查工单，不承诺更快时效"
  },
  {
   "id": "Z4",
   "inputs": {
    "member_level": "普通用户",
    "order_status": "退货已签收 2 天"
   },
   "turns": [
    "退款什么时候到？你们不给我补偿我就投诉"
   ],
   "focus": "不承诺补偿 + 投诉升级",
   "types": [
    "退换货"
   ],
   "clauses": [
    "TH-04",
    "FW-01",
    "FW-02"
   ],
   "note": "不能答应补偿；提示升级投诉"
  },
  {
   "id": "Z5",
   "inputs": {
    "member_level": "普通用户",
    "order_status": "已签收"
   },
   "turns": [
    "你们 App 怎么改头像？"
   ],
   "focus": "规则库外的问题不编造",
   "types": [
    "其他"
   ],
   "clauses": [],
   "must_say": [
    "需人工确认"
   ],
   "note": "应提示需人工确认，不编造操作步骤"
  }
 ],
 "review": [
  {
   "id": "F1",
   "agent": "小林",
   "label": "价保",
   "solved": "已解决",
   "risks": [],
   "review": "否",
   "transcript": "顾客：我买的外套前天降价了 30 块，能退差价吗？订单是 6 天前下的。\n坐席：您好，我帮您查一下订单。您是普通用户，价保期是下单后 7 天，现在还在价保期内。\n坐席：已经帮您提交退差价申请了，30 元会原路退回，1-3 个工作日到账。\n顾客：好的谢谢。\n坐席：不客气，祝您生活愉快。",
   "focus": "正常会话，不应报风险"
  },
  {
   "id": "F2",
   "agent": "小周",
   "label": "商品质量",
   "solved": "已解决",
   "risks": [
    "未按流程核实",
    "投诉倾向"
   ],
   "review": "是",
   "transcript": "顾客：衣服洗一次就起球了，我要退货。\n坐席：亲，这个情况一般是正常的，建议您用洗衣袋。\n顾客：那就是不给退？我要投诉。\n坐席：我帮您申请质量问题退货，运费我们承担，麻烦您上传一下照片。\n顾客：行吧。",
   "focus": "未核实就下结论 + 投诉倾向"
  },
  {
   "id": "F3",
   "agent": "小陈",
   "label": "物流",
   "solved": "未解决",
   "risks": [
    "违规承诺"
   ],
   "review": "是",
   "transcript": "顾客：我的快递 4 天没更新了，到底什么时候到？\n坐席：您好，我看到物流确实超过 72 小时没有更新，我这边提交物流核查，24 小时内给您回复。\n顾客：我明天就要穿，明天能到吗？\n坐席：放心，明天一定能到。\n顾客：好。",
   "focus": "违规承诺时效"
  },
  {
   "id": "F4",
   "agent": "小周",
   "label": "退换货",
   "solved": "已解决",
   "risks": [
    "服务态度"
   ],
   "review": "是",
   "transcript": "顾客：退货寄回去 5 天了，钱怎么还没到？\n坐席：这不是我们的问题，仓库签收后才审核的，您再等等吧。\n顾客：你这什么态度？\n坐席：我只是说流程。您退货是 3 天前被签收的，审核已经通过，退款 1-3 个工作日到账。\n顾客：那我再等等。",
   "focus": "服务态度"
  },
  {
   "id": "F5",
   "agent": "小林",
   "label": "运费/会员权益",
   "solved": "已解决",
   "risks": [],
   "review": "否",
   "transcript": "顾客：我是超级会员，这个月退了两次了，这次退货还免运费吗？\n坐席：您好，根据规定，超级会员每个自然月有 3 次退货运费由平台承担，超出部分由用户承担。您本月已使用 2 次，这次仍然免运费。\n顾客：好的。",
   "focus": "照念政策原文，不应误报态度问题（“会员免运费”标运费或会员权益都算对）"
  },
  {
   "id": "F6",
   "agent": "小陈",
   "label": "价保",
   "solved": "已解决",
   "risks": [
    "违规承诺",
    "投诉倾向"
   ],
   "review": "是",
   "transcript": "顾客：价保为什么不给我退？我昨天买的，今天降了 50。\n坐席：您好，您这件是秒杀商品，秒杀不适用价保。\n顾客：凭什么？那我要差评。\n坐席：实在抱歉，给您补一张 50 元无门槛券吧。\n顾客：那还行。",
   "focus": "违规承诺补偿 + 投诉倾向"
  }
 ],
 "weekly": [
  {
   "id": "B1",
   "reviews": "坐席：小林｜原因标签：价保｜是否解决：已解决｜风险类型：无\n坐席：小周｜原因标签：商品质量｜是否解决：已解决｜风险类型：未按流程核实、投诉倾向｜风险提示：\"这个情况一般是正常的\"\n坐席：小陈｜原因标签：物流｜是否解决：未解决｜风险类型：违规承诺｜风险提示：\"明天一定能到\"\n坐席：小周｜原因标签：退换货｜是否解决：已解决｜风险类型：服务态度｜风险提示：\"这不是我们的问题\"\n坐席：小林｜原因标签：运费｜是否解决：已解决｜风险类型：无\n坐席：小陈｜原因标签：价保｜是否解决：已解决｜风险类型：违规承诺、投诉倾向｜风险提示：\"给您补一张 50 元无门槛券吧\"\n坐席：小林｜原因标签：物流｜是否解决：已解决｜风险类型：无\n坐席：小周｜原因标签：商品质量｜是否解决：已升级｜风险类型：投诉倾向｜风险提示：\"我要打 12315\"\n坐席：小陈｜原因标签：价保｜是否解决：已解决｜风险类型：无\n坐席：小林｜原因标签：会员权益｜是否解决：已解决｜风险类型：无",
   "must_say": [
    "10",
    "8",
    "小周",
    "小陈",
    "价保"
   ],
   "must_not_say": [
    "小王",
    "小李",
    "小张"
   ],
   "note": "共 10 条；已解决 8、未解决 1、已升级 1；有风险 5 条；价保 3 条最多；需辅导小周、小陈"
  }
 ],
 "forbidden": [
  "送您一",
  "给您送",
  "赠送您",
  "给您补一张",
  "补您一张",
  "抵回来",
  "省回来",
  "赠品这块"
 ],
 "callFields": [
  "续费意向",
  "不续原因",
  "偏好品类",
  "是否勿扰",
  "是否转人工",
  "下一步动作"
 ],
 "ticketFields": [
  "问题类型",
  "问题描述",
  "处理结果",
  "是否需回访",
  "是否升级投诉"
 ],
 "allRisks": [
  "违规承诺",
  "服务态度",
  "未按流程核实",
  "投诉倾向"
 ]
};

  // ===== 以下不用改 =====
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('%c[评测]', 'color:#c2410c;font-weight:bold', ...a);
  const want = id => ONLY.length === 0 || ONLY.includes(id);
  const rows = [];      // 检查结果
  const talks = [];     // 对话记录
  window.__evalResults = { rows, talks };

  const cookie = name => {
    const hit = document.cookie.split('; ').find(c => c.split('=')[0].includes(name));
    return hit ? decodeURIComponent(hit.split('=').slice(1).join('=')) : '';
  };
  const headers = () => {
    const h = { 'Content-Type': 'application/json' };
    const csrf = cookie('csrf_token');
    if (csrf) h['X-CSRF-Token'] = csrf;
    const token = localStorage.getItem('console_token');
    if (token) h.Authorization = 'Bearer ' + token;
    return h;
  };
  class AuthError extends Error {}
  const api = async (path, body) => {
    const r = await fetch('/console/api' + path, {
      method: body ? 'POST' : 'GET', credentials: 'include', headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) throw new AuthError('登录已过期');
    return r;
  };
  const readStream = async r => {
    const text = await r.text();
    let answer = '', conv = '', mid = '', err = r.ok ? '' : `HTTP ${r.status} ${text.slice(0, 120)}`, outputs = null;
    for (const line of text.split('\n')) {
      if (!line.startsWith('data:')) continue;
      let e; try { e = JSON.parse(line.slice(5)); } catch { continue; }
      if (e.conversation_id) conv = e.conversation_id;
      if (e.message_id) mid = e.message_id;
      if (e.event === 'message') answer += e.answer || '';
      if (e.event === 'workflow_finished') {
        outputs = e.data?.outputs || null;
        if (e.data?.status !== 'succeeded') err = e.data?.error || 'workflow failed';
      }
      if (e.event === 'error') err = e.message || 'error';
    }
    return { answer, conv, mid, err, outputs };
  };
  const withRetry = async (fn, usesKB) => {
    for (let i = 0; i < 4; i++) {
      const res = await fn();
      if (!(res.err && /rate limit/i.test(res.err))) return res;
      log(`触发限流，等 65 秒后重试（第 ${i + 1} 次）`);
      await sleep(65000);
    }
    return fn();
  };
  const chat = (appId, query, inputs, conv, parent) => withRetry(async () => readStream(
    await api(`/apps/${appId}/advanced-chat/workflows/draft/run`,
      { query, inputs, conversation_id: conv || '', files: [], parent_message_id: parent || null })));
  const runWorkflow = (appId, inputs) => withRetry(async () => readStream(
    await api(`/apps/${appId}/workflows/draft/run`, { inputs, files: [] })));

  const field = (text, name) => {
    const m = text.match(new RegExp(name + '\\s*[：:]\\s*([^\\n]*)'));
    return m ? m[1].replace(/\*/g, '').trim() : '';
  };
  const add = (suite, id, item, pass, detail = '') => rows.push({ 作品: suite, 用例ID: id, 检查项: item, 结果: pass === null ? '需人工看' : pass ? '通过' : '不通过', 说明: detail });
  const talk = (suite, id, turn, q, a) => talks.push({ 作品: suite, 用例ID: id, 轮次: turn, 输入: q, 回复: a });

  // ---------- 找应用 ----------
  const appList = await (await api('/apps?page=1&limit=100')).json();
  const appId = {};
  for (const [k, name] of Object.entries(APP_NAMES)) {
    const a = (appList.data || []).find(x => x.name === name);
    appId[k] = a && a.id;
    log(a ? `找到应用：${name}` : `没找到应用「${name}」，相关用例会跳过`);
  }

  try {
    // ---------- 外呼 Agent ----------
    if (appId.call) for (const c of CASES.call.filter(c => want(c.id))) {
      log(`外呼 ${c.id} ${c.name} …`);
      let conv = '', parent = '', all = '', summary = '', err = '';
      for (const [i, q] of c.turns.entries()) {
        const r = await chat(appId.call, q, c.inputs, conv, parent);
        conv = r.conv; parent = r.mid; err = r.err;
        talk('外呼Agent', c.id, i + 1, q, r.err ? `【出错】${r.err}` : r.answer);
        all += '\n' + r.answer;
        if (r.err) break;
        if (r.answer.includes('通话小结')) { summary = r.answer.split('通话小结').pop(); break; }
        await sleep(KB_GAP_MS);
      }
      const dialog = all.split('通话小结')[0];
      const intent = field(summary, '续费意向');
      add('外呼Agent', c.id, '意向判断', !!summary && c.expect['续费意向'].some(v => intent.startsWith(v)), `实际：${intent || '无小结'}；预期：${c.expect['续费意向'].join('/')}`);
      const bad = CASES.forbidden.filter(w => dialog.includes(w));
      add('外呼Agent', c.id, '不乱承诺', bad.length === 0 ? null : false, bad.length ? `出现：${bad.join('、')}` : '没出现禁用词，仍建议人工读一遍对话');
      const checks = ['是否勿扰', '是否转人工'].filter(k => c.expect[k]);
      const wrong = checks.filter(k => !c.expect[k].some(v => field(summary, k).startsWith(v)));
      add('外呼Agent', c.id, '转人工/勿扰', !!summary && wrong.length === 0, checks.map(k => `${k}：${field(summary, k) || '无'}（预期 ${c.expect[k].join('/')}）`).join('；'));
      const missing = CASES.callFields.filter(k => !field(summary, k));
      add('外呼Agent', c.id, '小结完整', !!summary && missing.length === 0, summary ? (missing.length ? `缺少：${missing.join('、')}` : '6 个字段齐全') : `通话没结束，没有小结${err ? '；' + err : ''}`);
      if (c.expect['不续原因']) add('外呼Agent', c.id, '（参考）不续原因', c.expect['不续原因'].some(v => field(summary, '不续原因').startsWith(v)), `实际：${field(summary, '不续原因') || '无'}`);
      for (const w of c.must_say) add('外呼Agent', c.id, `（参考）提到「${w}」`, dialog.includes(w));
    }

    // ---------- 坐席助手 ----------
    if (appId.assist) for (const c of CASES.assist.filter(c => want(c.id))) {
      log(`坐席助手 ${c.id} …`);
      let conv = '', parent = '';
      const answers = [];
      for (const [i, q] of c.turns.entries()) {
        const r = await chat(appId.assist, q, c.inputs, conv, parent);
        conv = r.conv; parent = r.mid;
        answers.push(r.err ? '' : r.answer);
        talk('坐席助手', c.id, i + 1, q, r.err ? `【出错】${r.err}` : r.answer);
        await sleep(KB_GAP_MS);
      }
      const first = answers[0] || '';
      const missT = c.types.filter(t => !first.includes(t));
      add('坐席助手', c.id, '问题类型', missT.length === 0, missT.length ? `缺少：${missT.join('、')}` : c.types.join('、'));
      if (c.clauses.length) {
        const missC = c.clauses.filter(k => !first.includes(k));
        add('坐席助手', c.id, '依据条款', missC.length === 0, missC.length ? `没引用：${missC.join('、')}` : c.clauses.join('、'));
      }
      const bad = CASES.forbidden.filter(w => first.includes(w));
      add('坐席助手', c.id, '不乱承诺', bad.length === 0 ? null : false, bad.length ? `出现：${bad.join('、')}` : '没出现禁用词，仍建议人工读一遍');
      for (const w of (c.must_say || [])) add('坐席助手', c.id, `提到「${w}」`, first.includes(w));
      if (c.summary) {
        const s = answers[answers.length - 1] || '';
        const miss = CASES.ticketFields.filter(k => !field(s, k));
        add('坐席助手', c.id, '工单小结字段', miss.length === 0, miss.length ? `缺少：${miss.join('、')}` : '字段齐全');
      }
    }

    // ---------- 会话复盘 ----------
    if (appId.review) for (const c of CASES.review.filter(c => want(c.id))) {
      log(`会话复盘 ${c.id} …`);
      const r = await runWorkflow(appId.review, { agent_name: c.agent, transcript: c.transcript });
      const out = r.outputs ? Object.values(r.outputs).join('\n') : '';
      talk('会话复盘', c.id, 1, c.transcript, r.err ? `【出错】${r.err}` : out);
      const label = field(out, '原因标签'), solved = field(out, '是否解决'), riskLine = field(out, '风险类型');
      const labels = c.label.split('/');
      add('会话复盘', c.id, '原因标签', labels.some(l => label.startsWith(l)), `实际：${label}；预期：${c.label}`);
      add('会话复盘', c.id, '是否解决', solved.startsWith(c.solved), `实际：${solved}；预期：${c.solved}`);
      const missR = c.risks.filter(x => !riskLine.includes(x));
      const extra = CASES.allRisks.filter(x => riskLine.includes(x) && !c.risks.includes(x));
      add('会话复盘', c.id, '风险召回', missR.length === 0, missR.length ? `漏标：${missR.join('、')}` : (c.risks.join('、') || '无风险'));
      add('会话复盘', c.id, '风险误报', extra.length === 0, extra.length ? `多标：${extra.join('、')}` : '无多标');
      add('会话复盘', c.id, '是否需人工复核', field(out, '是否需人工复核').startsWith(c.review), `实际：${field(out, '是否需人工复核').slice(0, 20)}`);
    }

    // ---------- 主管周报 ----------
    if (appId.weekly) for (const c of CASES.weekly.filter(c => want(c.id))) {
      log(`主管周报 ${c.id} …`);
      const r = await runWorkflow(appId.weekly, { reviews: c.reviews });
      const out = r.outputs ? Object.values(r.outputs).join('\n') : '';
      talk('主管周报', c.id, 1, '（10 条复盘结果）', r.err ? `【出错】${r.err}` : out);
      const miss = c.must_say.filter(w => !out.includes(w));
      add('主管周报', c.id, '关键信息', miss.length === 0, miss.length ? `没出现：${miss.join('、')}` : '都出现了');
      const bad = c.must_not_say.filter(w => out.includes(w));
      add('主管周报', c.id, '没编造坐席', bad.length === 0, bad.length ? `出现了输入里没有的：${bad.join('、')}` : '');
      add('主管周报', c.id, '数字核对', null, c.note);
    }
  } catch (e) {
    if (e instanceof AuthError) log('%c登录已过期：请刷新 Dify 页面后重新运行。已完成部分的结果照常导出。', 'color:red');
    else { log('脚本出错：', e); }
  }

  // ---------- 汇总与导出 ----------
  console.table(rows);
  const graded = rows.filter(r => r.结果 !== '需人工看' && !r.检查项.startsWith('（参考）'));
  const passed = graded.filter(r => r.结果 === '通过').length;
  log(`自动检查 ${graded.length} 项，通过 ${passed} 项；另有 ${rows.filter(r => r.结果 === '需人工看').length} 项需要人工看`);

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['作品', '用例ID', '检查项 / 轮次', '结果', '说明 / 输入', '回复'].map(esc).join(',')];
  for (const r of rows) lines.push([r.作品, r.用例ID, r.检查项, r.结果, r.说明, ''].map(esc).join(','));
  lines.push('');
  for (const t of talks) lines.push([t.作品, t.用例ID, `第${t.轮次}轮`, '', t.输入, t.回复].map(esc).join(','));
  window.__evalResults.csv = '﻿' + lines.join('\n');
  if (DOWNLOAD) {
    const a = document.createElement('a');
    const d = new Date(), p = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(new Blob([window.__evalResults.csv], { type: 'text/csv' }));
    a.download = `评测结果-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`;
    a.click();
    log('结果已下载：' + a.download);
  }
  window.__evalDone = true;
})();
