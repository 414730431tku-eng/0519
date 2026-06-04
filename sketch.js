'use strict';

const W = 640;
const H = 480;

const cv = document.getElementById('c');
const g = cv.getContext('2d');
const vid = document.getElementById('vid');

let lm = null;

let score = 0;

let answer = 0;
let question = "";

let playerAnswer = null;

let state = "PLAY";

let resultText = "";

let cooldownUntil = 0;

const QUESTIONS = [

{q:"0+0",a:0},
{q:"0+1",a:1},
{q:"0+2",a:2},
{q:"0+3",a:3},
{q:"0+4",a:4},
{q:"0+5",a:5},

{q:"1+0",a:1},
{q:"1+1",a:2},
{q:"1+2",a:3},
{q:"1+3",a:4},
{q:"1+4",a:5},

{q:"2+0",a:2},
{q:"2+1",a:3},
{q:"2+2",a:4},
{q:"2+3",a:5},

{q:"3+0",a:3},
{q:"3+1",a:4},
{q:"3+2",a:5},

{q:"4+0",a:4},
{q:"4+1",a:5},

{q:"5+0",a:5},

{q:"1-0",a:1},
{q:"1-1",a:0},

{q:"2-0",a:2},
{q:"2-1",a:1},
{q:"2-2",a:0},

{q:"3-0",a:3},
{q:"3-1",a:2},
{q:"3-2",a:1},
{q:"3-3",a:0},

{q:"4-0",a:4},
{q:"4-1",a:3},
{q:"4-2",a:2},
{q:"4-3",a:1},
{q:"4-4",a:0},

{q:"5-0",a:5},
{q:"5-1",a:4},
{q:"5-2",a:3},
{q:"5-3",a:2},
{q:"5-4",a:1},
{q:"5-5",a:0}

];

const SKEL = [
[0,1],[1,2],[2,3],[3,4],
[0,5],[5,6],[6,7],[7,8],
[5,9],[9,10],[10,11],[11,12],
[9,13],[13,14],[14,15],[15,16],
[13,17],[0,17],[17,18],[18,19],[19,20]
];

function newQuestion(){

  const r =
  QUESTIONS[
    Math.floor(
      Math.random()*QUESTIONS.length
    )
  ];

  question = r.q + " = ?";
  answer = r.a;
}

newQuestion();

function countFingers(l){

  let c = 0;

  if(Math.abs(l[4].x-l[3].x) > 0.05) c++;

  if(l[8].y < l[6].y) c++;

  if(l[12].y < l[10].y) c++;

  if(l[16].y < l[14].y) c++;

  if(l[20].y < l[18].y) c++;

  return c;
}

function isThumbsUp(l){

  return (

    l[4].y < l[3].y &&

    l[8].y > l[6].y &&

    l[12].y > l[10].y &&

    l[16].y > l[14].y &&

    l[20].y > l[18].y

  );
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

 if(state === "WRONG"){

   if(isThumbsUp(lm)){

     state = "PLAY";

     resultText = "重新作答";

     cooldownUntil =
       Date.now()+1500;
   }

   return;
 }

 playerAnswer =
   countFingers(lm);

 if(playerAnswer === answer){

   score++;

   resultText =
     "✅ Correct!";

   state = "CORRECT";

   setTimeout(()=>{

     newQuestion();

     state = "PLAY";

     resultText = "";

   },1500);

 }else{

   state = "WRONG";

   resultText =
     "❌ Try Again! 比 👍";
 }

});

new Camera(vid,{
 onFrame:async()=>{
   await hands.send({image:vid});
 },
 width:W,
 height:H
}).start();

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

 g.strokeStyle =
 "#00ff88";

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
 "rgba(0,0,0,.6)";
 g.fillRect(
 10,
 10,
 280,
 160
 );

 g.fillStyle =
 "#fff";

 g.font =
 "bold 28px Arial";

 g.fillText(
 "手勢算數王",
 20,
 40
 );

 g.font =
 "24px Arial";

 g.fillText(
 question,
 20,
 80
 );

 g.fillText(
 "答案："+answer,
 20,
 115
 );

 g.fillText(
 "手勢："+(
 playerAnswer ?? "-"
 ),
 20,
 150
 );

 g.fillText(
 "分數："+score,
 20,
 185
 );

 g.font =
 "bold 36px Arial";

 g.fillText(
 resultText,
 20,
 240
 );

 requestAnimationFrame(loop);
}

loop();
