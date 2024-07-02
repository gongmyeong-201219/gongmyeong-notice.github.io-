(function() {
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;

  class Particle {
    constructor(x, vx, vy, size) {
      this.x = x;
      this.y = canvas.height + canvas.height / 2 * Math.random();
      this.vx = vx;
      this.vy = vy;
      particles[pIndex] = this;
      this.id = pIndex;
      pIndex++;
      this.life = 0;
      this.maxlife = 1;
      this.degree = getRandom(0, 360); // 開始角度をずらす
      this.width = getRandom(size, size * 2);
      this.height = getRandom(size, size * 2);
    }

    draw() {
      this.degree += 0.001;
      this.vx *= 0.95; // 重力
      this.vy *= 0.995; // 重力
      this.x += this.vx + Math.cos((this.degree * Math.PI) / 180); // 蛇行
      this.y -= this.vy + Math.sin((this.degree / 2 * Math.PI) / 180) * 0.001;

      ctx.globalAlpha = 1 - this.life; // lifeがへるごとに透明度が上がる

      ctx.drawImage(
        particleImage,
        this.x,
        this.y,
        this.width - this.life * this.width,
        this.height - this.life * this.height
      );

      this.life += 0.001;

      // lifeがなくなったら紙吹雪を削除
      if (this.life >= this.maxlife) {
        delete particles[this.id];
      }
    }
  }

  const canvas = document.querySelector("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext("2d");
  ctx.globalCompositeOperation = "source-over"; // 合成方法

  // stats.js
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  const particles = [];
  const objectPool = []; // オブジェクトプール
  let pIndex = 0;
  let x, y, frameId;
  const particleImage = new Image();
  particleImage.src = "https://dl.dropbox.com/s/fjb0ak4h8hktr2o/smoke.png?dl=0";

  // GUI
  const params = {
    amount: 1,
    bg_color: "#000",
    vx: 2,
    vy: 3,
    size: 400,
  };

  function setGUI() {
    const gui = new dat.GUI();
    gui.add(params, 'amount', 1.0, 10).step(1);
    gui.addColor(params, 'bg_color');
    gui.add(params, 'vx', 1.0, 10).step(0.1);
    gui.add(params, 'vy', 1.0, 10).step(0.1);
    gui.add(params, 'size', 5, 1000).step(1);
  }

  setGUI();

  // アニメーション
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 画面の更新
    canvas.style.background = params.bg_color; // 背景色変更
    if (frameId % 3 == 0) {
      // 量を制御
      for (let i = 0; i < params.amount; i++) {
        new Particle(
          getRandom(canvas.width / 8, canvas.width - canvas.width / 8),
          getRandom(-params.vx, params.vx),
          getRandom(params.vy / 2, params.vy * 2),
          params.size + Math.cos(frameId) * 100 // 大きさを時間で変化させる
        );
      }
    }
    for (let i in particles) {
      particles[i].draw();
    }

    frameId = requestAnimationFrame(loop);
    if (frameId % 2 == 0) {
      return;
    } // 60fpsを30fpsにする
    stats.update();
  }

  loop();

  // 全画面リサイズ
  window.addEventListener("resize", function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    x = canvas.width / 2;
    y = canvas.height / 2;
  });

  function getRandom(min, max) {
    return Math.random() * (max - min) + min;
  }
})();
