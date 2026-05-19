'use strict';

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const W = 640, H = 480;
const cv = document.getElementById('c');
const g = cv.getContext('2d');
const vid = document.getElementById('vid');

const PICKS = ['rock', 'paper', 'scissors'];

const EM = {
    rock: '✊',
    paper: '🖐',
    scissors: '✌️',
    one: '☝️',
    three: '3️⃣'
};

const LB = {
    rock: '石頭',
    paper: '布',
    scissors: '剪刀',
    one: '繼續',
    three: '結束'
};

const BEATS = {
    rock: 'scissors',
    scissors: 'paper',
    paper: 'rock'
};

const PAL = [
    '#FF6B6B',
    '#FFE66D',
    '#4ECDC4',
    '#C3A6FF',
    '#FF9F43',
    '#56CCF2',
    '#FD79A8',
    '#A3F7BF'
];

const SKEL = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[0,17],[17,18],[18,19],[19,20]
];

// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
let st = 'loading', stAt = Date.now();

const enter = s => {
    st = s;
    stAt = Date.now();
};

let pG = null;
let cG = null;

let lm = null;
let stable = null;

let gBuf = [];
let holdT = null;
let menuHoldT = null;

const BUF = 10;
const HOLD = 400;
const CD = 3;

let score = { w:0, l:0, d:0 };

let mx = 0, my = 0;

cv.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
});

cv.addEventListener('click', onClk);

// ─────────────────────────────────────────────────────────────
//  MEDIAPIPE
// ─────────────────────────────────────────────────────────────
(function () {

    const hands = new Hands({
        locateFile: f =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: .72,
        minTrackingConfidence: .5
    });

    hands.onResults(r => {

        if (r.multiHandLandmarks && r.multiHandLandmarks[0]) {

            lm = r.multiHandLandmarks[0];

            const gest = classify(lm);

            gBuf.push(gest);

            if (gBuf.length > BUF) gBuf.shift();

            stable = vote(gBuf);

        } else {

            lm = null;
            stable = null;
            gBuf = [];
        }
    });

    new Camera(vid, {
        onFrame: async () => hands.send({ image: vid }),
        width: W,
        height: H
    }).start().then(() => {

        if (st === 'loading') enter('idle');

    });

})();

// ─────────────────────────────────────────────────────────────
//  GESTURE
// ─────────────────────────────────────────────────────────────
function classify(l) {

    const tips = [8,12,16,20];
    const pips = [6,10,14,18];

    const ext = tips.map((t,i)=>
        l[t].y < l[pips[i]].y
    );

    const index  = ext[0];
    const middle = ext[1];
    const ring   = ext[2];
    const pinky  = ext[3];

    const n = ext.filter(Boolean).length;

    // ☝️ ONE
    if(index && !middle && !ring && !pinky){
        return 'one';
    }

    // 3️⃣ THREE
    if(index && middle && ring && !pinky){
        return 'three';
    }

    // ✊
    if(n === 0) return 'rock';

    // 🖐
    if(n >= 4) return 'paper';

    // ✌️
    if(index && middle && !ring && !pinky){
        return 'scissors';
    }

    return 'unknown';
}

function vote(buf){

    if(buf.length < 6) return null;

    const c = {};

    buf.forEach(v=>{
        c[v] = (c[v]||0)+1;
    });

    let b = null;
    let bn = 0;

    for(const v in c){

        if(v !== 'unknown' && c[v] > bn){

            bn = c[v];
            b = v;
        }
    }

    return bn / buf.length >= .55 ? b : null;
}

// ─────────────────────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────────────────────
function rr(x,y,w,h,r){

    g.beginPath();

    g.moveTo(x+r,y);

    g.arcTo(x+w,y,x+w,y+h,r);
    g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);
    g.arcTo(x,y,x+w,y,r);

    g.closePath();
}

function lxy(p){
    return [(1-p.x)*W, p.y*H];
}

function skel(){

    if(!lm) return;

    g.save();

    g.strokeStyle='rgba(0,255,130,.8)';
    g.lineWidth=2;

    SKEL.forEach(([a,b])=>{

        const [ax,ay]=lxy(lm[a]);
        const [bx,by]=lxy(lm[b]);

        g.beginPath();
        g.moveTo(ax,ay);
        g.lineTo(bx,by);
        g.stroke();

    });

    lm.forEach((p,i)=>{

        const [x,y]=lxy(p);

        g.fillStyle=i?'#00FF88':'#FF4466';

        g.beginPath();
        g.arc(x,y,i?3.5:6,0,Math.PI*2);
        g.fill();

    });

    g.restore();
}

function boldT(t,x,y,fs,col){

    g.save();

    g.font=`bold ${fs}px Arial`;

    g.textAlign='center';
    g.textBaseline='middle';

    g.fillStyle=col||'#FFF';

    g.fillText(t,x,y);

    g.restore();
}

function smT(t,x,y,fs,col){

    g.save();

    g.font=`${fs}px Arial`;

    g.textAlign='center';
    g.textBaseline='middle';

    g.fillStyle=col||'rgba(255,255,255,.7)';

    g.fillText(t,x,y);

    g.restore();
}

function drawVid(){

    if(!vid || vid.readyState < 2) return;

    g.save();

    g.translate(W,0);
    g.scale(-1,1);

    g.drawImage(vid,0,0,W,H);

    g.restore();
}

function scoreHUD(){

    g.save();

    g.fillStyle='rgba(0,0,0,.55)';

    rr(W-190,10,180,40,10);

    g.fill();

    g.font='bold 14px Arial';

    g.fillStyle='#00FF88';
    g.fillText(`勝 ${score.w}`,W-170,35);

    g.fillStyle='#FF5555';
    g.fillText(`敗 ${score.l}`,W-115,35);

    g.fillStyle='#FFD93D';
    g.fillText(`平 ${score.d}`,W-60,35);

    g.restore();
}

function dLoading(){

    g.fillStyle='#0d1117';
    g.fillRect(0,0,W,H);

    boldT('載入 AI 手勢辨識中...',W/2,H/2,30,'#FFF');
}

function dIdle(){

    skel();

    scoreHUD();

    if(!lm){

        boldT('請比出石頭 / 布 / 剪刀',W/2,H-60,24,'#FFF');

    }else if(stable){

        boldT(
            `${EM[stable]} ${LB[stable]}`,
            W/2,
            H-70,
            28,
            '#00FF88'
        );

        const pct = holdT
            ? Math.min(1,(Date.now()-holdT)/HOLD)
            : 0;

        g.fillStyle='rgba(255,255,255,.2)';
        rr(W/2-100,H-40,200,10,5);
        g.fill();

        g.fillStyle='#00FF88';
        rr(W/2-100,H-40,200*pct,10,5);
        g.fill();
    }
}

function dCountdown(){

    skel();

    scoreHUD();

    const el = Date.now()-stAt;

    const rem = CD*1000 - el;

    const sc = Math.ceil(rem/1000);

    boldT(sc,W/2,H/2,120,'#00FF88');
}

function dReveal(){

    g.fillStyle='rgba(0,0,0,.75)';
    g.fillRect(0,0,W,H);

    boldT(
        `${EM[pG]}  VS  ${EM[cG]}`,
        W/2,
        H/2,
        90,
        '#FFF'
    );
}

function dResult(txt,col){

    g.fillStyle='rgba(0,0,0,.75)';
    g.fillRect(0,0,W,H);

    boldT(txt,W/2,H/2-50,46,col);

    smT(
        `你：${EM[pG]}    電腦：${EM[cG]}`,
        W/2,
        H/2+20,
        24
    );
}

function btn(lbl,x,y,w,h,bg){

    g.save();

    g.fillStyle=bg;

    rr(x,y,w,h,20);

    g.fill();

    g.font='bold 22px Arial';

    g.textAlign='center';
    g.textBaseline='middle';

    g.fillStyle='#FFF';

    g.fillText(lbl,x+w/2,y+h/2);

    g.restore();
}

function dMenu(){

    g.fillStyle='rgba(0,0,0,.8)';
    g.fillRect(0,0,W,H);

    boldT('再玩一局？',W/2,120,40,'#FFF');

    smT('☝️ 比一＝繼續',W/2,170,22,'#00FF88');

    smT('3️⃣ 比三＝結束',W/2,210,22,'#FF5555');

    const bw=160;
    const bh=60;
    const by=300;

    btn('🏠 結束',W/2-bw-15,by,bw,bh,'#CC2200');

    btn('🎮 繼續',W/2+15,by,bw,bh,'#00AA44');

    if(stable === 'one' || stable === 'three'){

        const pct = menuHoldT
            ? Math.min(1,(Date.now()-menuHoldT)/HOLD)
            : 0;

        const isContinue = stable === 'one';

        const col = isContinue
            ? '#00FF88'
            : '#FF4444';

        g.fillStyle='rgba(255,255,255,.2)';
        rr(W/2-100,400,200,10,5);
        g.fill();

        g.fillStyle=col;
        rr(W/2-100,400,200*pct,10,5);
        g.fill();

        const txt = isContinue
            ? '🎮 準備繼續...'
            : '🏠 準備結束...';

        boldT(txt,W/2,430,20,col);
    }
}

function dEnded(){

    g.fillStyle='#0d1117';
    g.fillRect(0,0,W,H);

    boldT('感謝遊戲！',W/2,H/2-30,50,'#FFF');

    smT(
        `勝 ${score.w}　敗 ${score.l}　平 ${score.d}`,
        W/2,
        H/2+40,
        24
    );
}

// ─────────────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────────────
function update(){

    const now = Date.now();

    const el = now - stAt;

    // MENU
    if(st === 'menu'){

        if(stable === 'one' || stable === 'three'){

            if(!menuHoldT) menuHoldT = now;

            if(now - menuHoldT >= HOLD){

                if(stable === 'one'){
                    startGame();
                }

                if(stable === 'three'){
                    enter('ended');
                }

                menuHoldT = null;
            }

        }else{

            menuHoldT = null;
        }
    }

    // IDLE
    if(st === 'idle'){

        if(stable && PICKS.includes(stable)){

            if(pG !== stable){

                holdT = now;
                pG = stable;
            }

            if(now - holdT >= HOLD){

                enter('countdown');
            }

        }else{

            holdT = null;
            pG = null;
        }
    }

    // COUNTDOWN
    if(st === 'countdown'){

        if(stable && PICKS.includes(stable)){
            pG = stable;
        }

        if(el >= CD*1000){

            cG = PICKS[Math.random()*3|0];

            enter('reveal');
        }
    }

    // REVEAL
    if(st === 'reveal' && el > 1500){

        const res =
            pG === cG
                ? 'draw'
                : BEATS[pG] === cG
                    ? 'win'
                    : 'lose';

        if(res === 'win') score.w++;
        else if(res === 'lose') score.l++;
        else score.d++;

        enter(res);
    }

    if(st === 'win' && el > 2500){
        enter('menu');
    }

    if(st === 'lose' && el > 2500){
        enter('menu');
    }

    if(st === 'draw' && el > 2500){
        enter('menu');
    }
}

function onClk(e){

    if(st !== 'menu') return;

    const r = cv.getBoundingClientRect();

    const cx = e.clientX-r.left;
    const cy = e.clientY-r.top;

    const bw=160;
    const bh=60;
    const by=300;

    // continue
    if(
        cx >= W/2+15 &&
        cx <= W/2+15+bw &&
        cy >= by &&
        cy <= by+bh
    ){
        startGame();
    }

    // end
    if(
        cx >= W/2-bw-15 &&
        cx <= W/2-15 &&
        cy >= by &&
        cy <= by+bh
    ){
        enter('ended');
    }
}

function startGame(){

    gBuf = [];
    stable = null;

    holdT = null;

    pG = null;
    cG = null;

    enter('idle');
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
function loop(){

    update();

    g.clearRect(0,0,W,H);

    if(st !== 'loading' && st !== 'ended'){
        drawVid();
    }

    const draw = {
        loading:dLoading,
        idle:dIdle,
        countdown:dCountdown,
        reveal:dReveal,
        win:()=>dResult('🎉 你贏了！','#00FF88'),
        lose:()=>dResult('😢 你輸了！','#FF4444'),
        draw:()=>dResult('🤝 平手！','#FFD93D'),
        menu:dMenu,
        ended:dEnded
    };

    (draw[st] || dLoading)();

    requestAnimationFrame(loop);
}

loop();
