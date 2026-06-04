'use strict';

// =====================================
// 手勢算數王
// 單手版 0~5
// 答錯後 👍 重答
// =====================================

const W = 640;
const H = 480;

const cv = document.getElementById('c');
const g = cv.getContext('2d');
const vid = document.getElementById('vid');

let lm = null;

// =====================================
// 骨架
// =====================================

const SKEL = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[0,17],[17,18],[18,19],[19,20]
];

// =====================================
// 遊戲資料
// =====================================

let score = 0;

let currentQuestion = '';
let correctAnswer = 0;

let playerAnswer = null;

let resultText = '';
let resultColor = '#FFFFFF';

let answerLock = false;
let answerTime = 0;

let wrongAnswer = false;

// =====================================
// 題目產生
// =====================================

function generateQuestion(){

    const op = Math.random() > 0.5 ? '+' : '-';

    let a;
    let b;

    if(op === '+'){

        do{

            a = Math.floor(Math.random()*6);
            b = Math.floor(Math.random()*6);

        }while(a + b > 5);

        correctAnswer = a + b;
    }
    else{

        a = Math.floor(Math.random()*6);
        b = Math.floor(Math.random()*6);

        if(a < b){

            const t = a;
            a = b;
            b = t;
        }

        correctAnswer = a - b;
    }

    currentQuestion =
        `${a} ${op} ${b} = ?`;
}

// =====================================
// 手指數量
// =====================================

function countFingers(l){

    const tips = [8,12,16,20];
    const pips = [6,10,14,18];

    let count = 0;

    tips.forEach((tip,index)=>{

        if(
            l[tip].y <
            l[pips[index]].y
        ){
            count++;
        }

    });

    return count;
}

// =====================================
// 👍 比讚辨識
// =====================================

function isThumbsUp(l){

    const thumbUp =
        l[4].y < l[3].y;

    const fingersDown =

        l[8].y  > l[6].y  &&
        l[12].y > l[10].y &&
        l[16].y > l[14].y &&
        l[20].y > l[18].y;

    return (
        thumbUp &&
        fingersDown
    );
}

// =====================================
// 判定答案
// =====================================

function checkAnswer(){

    if(playerAnswer === null)
        return;

    if(playerAnswer === correctAnswer){

        score++;

        wrongAnswer = false;

        resultText =
            '✅ Correct!';

        resultColor =
            '#00FF88';

        answerLock = true;

        answerTime =
            Date.now();
    }
    else{

        wrongAnswer = true;

        resultText =
            '❌ Try Again!';

        resultColor =
            '#FF4444';
    }
}

// =====================================
// MediaPipe
// =====================================

generateQuestion();

(function(){

    const hands = new Hands({

        locateFile:file =>

        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`

    });

    hands.setOptions({

        maxNumHands:1,

        modelComplexity:1,

        minDetectionConfidence:0.7,

        minTrackingConfidence:0.5

    });

    hands.onResults(results=>{

        if(
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length
        ){

            lm =
                results.multiHandLandmarks[0];

            if(!answerLock){

                if(wrongAnswer){

                    if(
                        isThumbsUp(lm)
                    ){

                        wrongAnswer = false;

                        resultText =
                            '👍 請重新作答';

                        resultColor =
                            '#FFD93D';
                    }
                }                else{

                    playerAnswer =
                        countFingers(lm);

                    checkAnswer();
                }
            }
        }
        else{

            lm = null;

            playerAnswer = null;
        }

    });

    const camera = new Camera(

        vid,

        {
            onFrame:async()=>{

                await hands.send({
                    image:vid
                });

            },

            width:W,
            height:H
        }
    );

    camera.start();

})();

// =====================================
// 繪製攝影機
// =====================================

function drawVideo(){

    if(
        !vid ||
        vid.readyState < 2
    ) return;

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

// =====================================
// 繪製骨架
// =====================================

function drawSkeleton(){

    if(!lm) return;

    g.save();

    g.strokeStyle =
        '#00FF88';

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

    lm.forEach((p,i)=>{

        const x =
            (1-p.x)*W;

        const y =
            p.y*H;

        g.fillStyle =
            i===0
            ? '#FF4444'
            : '#00FF88';

        g.beginPath();

        g.arc(
            x,
            y,
            4,
            0,
            Math.PI*2
        );

        g.fill();

    });

    g.restore();
}

// =====================================
// 題目面板
// =====================================

function drawPanel(){

    g.save();

    g.fillStyle =
        'rgba(0,0,0,.65)';

    g.fillRect(
        10,
        10,
        300,
        180
    );

    g.fillStyle =
        '#FFFFFF';

    g.font =
        'bold 28px Arial';

    g.fillText(
        '手勢算數王',
        20,
        45
    );

    g.font =
        '24px Arial';

    g.fillText(
        currentQuestion,
        20,
        90
    );

    g.fillText(
        '你的答案：' +
        (
            playerAnswer === null
            ? '-'
            : playerAnswer
        ),
        20,
        130
    );

    g.fillText(
        '分數：' + score,
        20,
        170
    );

    g.restore();
}

// =====================================
// 顯示結果
// =====================================

function drawResult(){

    if(
        resultText === ''
    ) return;

    g.save();

    g.fillStyle =
        resultColor;

    g.font =
        'bold 42px Arial';

    g.textAlign =
        'center';

    g.fillText(

        resultText,

        W/2,

        70

    );

    g.restore();
}// =====================================
// 更新遊戲狀態
// =====================================

function update(){

    if(answerLock){

        const elapsed =
            Date.now() -
            answerTime;

        if(elapsed > 1500){

            answerLock = false;

            resultText = '';

            playerAnswer = null;

            generateQuestion();
        }
    }
}

// =====================================
// 主迴圈
// =====================================

function loop(){

    update();

    g.clearRect(
        0,
        0,
        W,
        H
    );

    drawVideo();

    drawSkeleton();

    drawPanel();

    drawResult();

    // 額外提示

    g.save();

    g.fillStyle =
        '#FFFFFF';

    g.font =
        '20px Arial';

    g.textAlign =
        'center';

    if(wrongAnswer){

        g.fillStyle =
            '#FFD93D';

        g.fillText(

            '請比 👍 後重新作答',

            W/2,

            H - 40

        );
    }
    else{

        g.fillText(

            '請用手指數量回答題目',

            W/2,

            H - 40

        );
    }

    g.restore();

    requestAnimationFrame(
        loop
    );
}

// =====================================
// 開始遊戲
// =====================================

loop();
