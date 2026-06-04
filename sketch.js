'use strict';

const W = 640;
const H = 480;

const cv = document.getElementById('c');
const g = cv.getContext('2d');
const vid = document.getElementById('vid');

let lm = null;

const SKEL = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[0,17],[17,18],[18,19],[19,20]
];

let score = 0;
let currentQuestion = "";
let correctAnswer = 0;

let playerAnswer = null;
let resultText = "";
let resultColor = "#ffffff";

let answerLock = false;
let answerTime = 0;

function generateQuestion(){

    const op = Math.random() > 0.5 ? "+" : "-";

    let a,b;

    if(op === "+"){

        a = Math.floor(Math.random()*6);
        b = Math.floor(Math.random()*6);

        while(a+b > 5){
            a = Math.floor(Math.random()*6);
            b = Math.floor(Math.random()*6);
        }

        correctAnswer = a+b;
    }
    else{

        a = Math.floor(Math.random()*6);
        b = Math.floor(Math.random()*6);

        if(a < b){
            [a,b] = [b,a];
        }

        correctAnswer = a-b;
    }

    currentQuestion = `${a} ${op} ${b} = ?`;
}

generateQuestion();

(function(){

    const hands = new Hands({
        locateFile:(file)=>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands:1,
        modelComplexity:1,
        minDetectionConfidence:0.7,
        minTrackingConfidence:0.5
    });

    hands.onResults(results=>{

        if(results.multiHandLandmarks &&
           results.multiHandLandmarks.length){

            lm = results.multiHandLandmarks[0];

            if(!answerLock){

                playerAnswer = countFingers(lm);

                checkAnswer();
            }
        }
        else{
            lm = null;
            playerAnswer = null;
        }

    });

    const camera = new Camera(vid,{
        onFrame:async()=>{
            await hands.send({image:vid});
        },
        width:W,
        height:H
    });

    camera.start();

})();

function countFingers(l){

    const tips = [8,12,16,20];
    const pips = [6,10,14,18];

    let count = 0;

    tips.forEach((tip,index)=>{

        if(l[tip].y < l[pips[index]].y){
            count++;
        }

    });

    return count;
}

function checkAnswer(){

    if(playerAnswer === null) return;

    if(playerAnswer === correctAnswer){

        score++;

        resultText = "✅ Correct!";
        resultColor = "#00ff88";

        answerLock = true;
        answerTime = Date.now();

    }
}

function drawVideo(){

    if(vid.readyState < 2) return;

    g.save();

    g.translate(W,0);
    g.scale(-1,1);

    g.drawImage(vid,0,0,W,H);

    g.restore();
}

function drawSkeleton(){

    if(!lm) return;

    g.save();

    g.strokeStyle="#00ff88";
    g.lineWidth=2;

    SKEL.forEach(([a,b])=>{

        const ax=(1-lm[a].x)*W;
        const ay=lm[a].y*H;

        const bx=(1-lm[b].x)*W;
        const by=lm[b].y*H;

        g.beginPath();
        g.moveTo(ax,ay);
        g.lineTo(bx,by);
        g.stroke();

    });

    lm.forEach((p,i)=>{

        const x=(1-p.x)*W;
        const y=p.y*H;

        g.fillStyle=i===0?"#ff4444":"#00ff88";

        g.beginPath();
        g.arc(x,y,4,0,Math.PI*2);
        g.fill();

    });

    g.restore();
}

function drawPanel(){

    g.fillStyle="rgba(0,0,0,0.65)";
    g.fillRect(10,10,250,140);

    g.fillStyle="#ffffff";
    g.font="bold 28px Arial";
    g.fillText("手勢算數王",20,45);

    g.font="22px Arial";
    g.fillText(currentQuestion,20,85);

    g.fillText(
        "答案: " +
        (playerAnswer===null?"-":playerAnswer),
        20,
        120
    );

    g.fillText(
        "分數: " + score,
        20,
        155
    );
}

function drawResult(){

    if(resultText==="") return;

    g.fillStyle=resultColor;

    g.font="bold 42px Arial";
    g.textAlign="center";

    g.fillText(
        resultText,
        W/2,
        70
    );

    g.textAlign="left";
}

function update(){

    if(answerLock){

        if(Date.now()-answerTime > 1500){

            answerLock = false;

            resultText="";

            generateQuestion();
        }
    }

    if(
        !answerLock &&
        playerAnswer !== null &&
        playerAnswer !== correctAnswer
    ){

        resultText = "❌ Try Again!";
        resultColor = "#ff4444";
    }
}

function draw(){

    update();

    g.clearRect(0,0,W,H);

    drawVideo();

    drawSkeleton();

    drawPanel();

    drawResult();

    requestAnimationFrame(draw);
}

draw();
