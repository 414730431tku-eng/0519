'use strict';

const W = 640;
const H = 480;

const cv = document.getElementById('c');
const g = cv.getContext('2d');
const vid = document.getElementById('vid');

let lm = null;

let score = 0;
let question = '';
let answer = 0;

let resultText = '';
let state = 'PLAY';

let cooldownUntil = 0;

let lastGesture = null;
let gestureStart = 0;

let choices = {
  OK: 0,
  ONE: 0,
  FIVE: 0
};

let currentGesture = '';

const QUESTIONS = [
  {q:"1+1",a:2},
  {q:"1+2",a:3},
  {q:"1+3",a:4},
  {q:"1+4",a:5},

  {q:"2+1",a:3},
  {q:"2+2",a:4},
  {q:"2+3",a:5},

  {q:"3+1",a:4},
  {q:"3+2",a:5},

  {q:"5-1",a:4},
  {q:"5-2",a:3},
  {q:"5-3",a:2},
  {q:"5-4",a:1},

  {q:"4-1",a:3},
  {q:"4-2",a:2},
  {q:"4-3",a:1},

  {q:"3-1",a:2},
  {q:"3-2",a:1},

  {q:"2-1",a:1}
];

const SKEL = [
[0,1],[1,2],[2,3],[3,4],
[0,5],[5,6],[6,7],[7,8],
[5,9],[9,10],[10,11],[11,12],
[9,13],[13,14],[14,15],[15,16],
[13,17],[0,17],[17,18],[18,19],[19,20]
];

function shuffle(arr){
  return [...arr].sort(()=>Math.random()-0.5);
}

function newQuestion(){

  const q =
  QUESTIONS[
    Math.floor(
      Math.random()*QUESTIONS.length
    )
  ];

  question = q.q + ' = ?';
  answer = q.a;

  let nums =
  shuffle([0,1,2,3,4,5])
  .slice(0,3);

  if(!nums.includes(answer)){
    nums[0] = answer;
  }

  nums = shuffle(nums);

  choices.OK = nums[0];
  choices.ONE = nums[1];
  choices.FIVE = nums[2];
}

newQuestion();

function isThumbsUp(l){

  return (

    l[4].y < l[2].y &&

    l[8].y > l[5].y &&

    l[12].y > l[9].y &&

    l[16].y > l[13].y &&

    l[20].y > l[17].y

  );

}

function isOne(l){

  return (

    l[8].y < l[6].y &&

    l[12].y > l[10].y &&

    l[16].y > l[14].y &&

    l[20].y > l[18].y &&

    !isThumbsUp(l)

  );

}

function isOK(l){

  const dx = (l[4].x - l[8].x);
  const dy = (l[4].y - l[8].y);
  const dist = Math.sqrt(dx*dx + dy*dy);

  return (
    dist < 0.04 &&
    l[12].y > l[10].y &&
    l[16].y > l[14].y &&
    l[20].y > l[18].y
  );

}

function isFive(l){

  return (
    l[8].y < l[6].y &&
    l[12].y < l[10].y &&
    l[16].y < l[14].y &&
    l[20].y < l[18].y &&
    !isThumbsUp(l)
  );

}

function detectGesture(l){

  if(isThumbsUp(l))
    return 'THUMB';

  if(isOK(l))
    return 'OK';

  if(isOne(l))
    return 'ONE';

  if(isFive(l))
    return 'FIVE';

  return null;

}

const hands = new Hands({
  locateFile:(f)=>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands:1,
  modelComplexity:1,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.5
});

hands.onResults((r)=>{

  if(
    !r.multiHandLandmarks ||
    !r.multiHandLandmarks.length
  ) return;

  lm = r.multiHandLandmarks[0];

  if(Date.now() < cooldownUntil)
    return;

  const gesture =
  detectGesture(lm);
  
  currentGesture =
  gesture || '';

  if(gesture !== lastGesture){

    lastGesture = gesture;
    gestureStart = Date.now();

    return;
  }

  if(Date.now()-gestureStart < 800)
    return;

  if(state === 'WRONG'){

  if(gesture === 'THUMB'){

    state = 'PLAY';

    resultText =
    '重新作答';

    lastGesture = null;

    cooldownUntil =
    Date.now()+1500;
  }

  return;
}

  if(state !== 'PLAY')
    return;

  let selected = null;

  if(gesture === 'OK')
    selected = choices.OK;

  if(gesture === 'ONE')
    selected = choices.ONE;

  if(gesture === 'FIVE')
    selected = choices.FIVE;

  if(selected === null)
    return;

  if(selected === answer){

    score++;

    state = 'CORRECT';

    resultText =
    '✅ Correct!';

    cooldownUntil =
    Date.now()+1500;

    setTimeout(()=>{

      newQuestion();

      state = 'PLAY';

      resultText = '';

    },1500);

  }else{

    state = 'WRONG';

    resultText =
    '❌ Try Again! 比 👍';

  }

});

const cam = new Camera(vid,{
  onFrame:async()=>{
    await hands.send({image:vid});
  },
  width:W,
  height:H
});

cam.start().catch((err)=>{
  console.error('Camera start failed:',err);
  resultText = '無法啟用相機：' + (err.name || err.message || err);
  state = 'ERROR';
  // 提示於主控台，並建議使用者檢查權限/裝置
});

function drawVideo(){

  if(vid.readyState < 2)
    return;

  g.save();

  g.translate(W,0);
  g.scale(-1,1);

  g.drawImage(
    vid,
    0,
    0,
    W,
    H
  );

  g.restore();
}

function drawSkeleton(){

  if(!lm) return;

  g.strokeStyle = '#00ff88';
  g.lineWidth = 2;

  SKEL.forEach(([a,b])=>{

    const ax =
    (1-lm[a].x)*W;

    const ay =
    lm[a].y*H;

    const bx =
    (1-lm[b].x)*W;

    const by =
    lm[b].y*H;

    g.beginPath();

    g.moveTo(ax,ay);
    g.lineTo(bx,by);

    g.stroke();
  });
}

function loop(){

  g.clearRect(0,0,W,H);

  drawVideo();
  drawSkeleton();

  g.fillStyle =
  'rgba(0,0,0,.7)';

  g.fillRect(
    10,
    10,
    360,
    280
  );

  g.fillStyle =
  '#fff';

  g.font =
  'bold 28px Arial';

  g.fillText(
    '手勢算數王',
    20,
    40
  );

  g.font =
  '24px Arial';

  g.fillText(
    question,
    20,
    80
  );

  g.fillText(
    '👌 = ' + choices.OK,
    20,
    120
  );

  g.fillText(
    '☝️ = ' + choices.ONE,
    20,
    160
  );

  g.fillText(
    '🖐 = ' + choices.FIVE,
    20,
    200
  );

  g.fillText(
    '分數：' + score,
    20,
    240
  );

  g.font =
  '20px Arial';

  g.fillText(
  '手勢：' + currentGesture,
  20,
  265
);


  g.font =
  'bold 30px Arial';

  g.fillText(
    resultText,
    20,
    280
  );

  requestAnimationFrame(loop);
}

loop();
