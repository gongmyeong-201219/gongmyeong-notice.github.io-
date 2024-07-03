(function() {
      // Canvas 설정
      const canvas = document.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Particle 클래스 정의
      class Particle {
        constructor(x, vx, vy, size) {
          this.x = x;
          this.y = canvas.height + canvas.height / 2 * Math.random();
          this.vx = vx;
          this.vy = vy;
          this.life = 0;
          this.maxlife = 1;
          this.degree = getRandom(0, 360); // 시작 각도
          this.width = getRandom(size, size * 2);
          this.height = getRandom(size, size * 2);
        }

        draw() {
          this.degree += 0.001;
          this.vx *= 0.95; // 중력
          this.vy *= 0.995; // 중력
          this.x += this.vx + Math.cos((this.degree * Math.PI) / 180); // 왜곡
          this.y -= this.vy + Math.sin((this.degree / 2 * Math.PI) / 180) * 0.001;

          ctx.globalAlpha = 1 - this.life; // life가 줄어들 때마다 투명도 증가

          ctx.drawImage(
            particleImage,
            this.x,
            this.y,
            this.width - this.life * this.width,
            this.height - this.life * this.height
          );

          this.life += 0.001;

          // life가 모두 소멸하면 파티클 제거
          if (this.life >= this.maxlife) {
            delete particles[this.id];
          }
        }
      }

      // 파티클 이미지 설정
      const particleImage = new Image();
      particleImage.src = "https://dl.dropbox.com/s/fjb0ak4h8hktr2o/smoke.png?dl=0";

      // GUI 설정
      const params = {
        amount: 1,
        bg_color: "#000",
        vx: 2,
        vy: 3,
        size: 400,
        hideGUI: false // GUI 숨기기 여부
      };

      function setGUI() {
        const gui = new dat.GUI();
        gui.add(params, 'amount', 1.0, 10).step(1);
        gui.addColor(params, 'bg_color');
        gui.add(params, 'vx', 1.0, 10).step(0.1);
        gui.add(params, 'vy', 1.0, 10).step(0.1);
        gui.add(params, 'size', 5, 1000).step(1);
        gui.add(params, 'hideGUI').onChange(updateGUIVisibility);
      }

      setGUI();

      // GUI 숨기기/보이기 함수
      function updateGUIVisibility(hide) {
        const guiDom = document.querySelector('.dg');
        if (hide) {
          guiDom.style.display = 'none';
        } else {
          guiDom.style.display = 'block';
        }
      }

      // 애니메이션 루프
      const particles = [];
      let frameId;

      function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 화면 업데이트
        canvas.style.background = params.bg_color; // 배경색 변경
        if (frameId % 3 === 0) {
          // 양을 제어
          for (let i = 0; i < params.amount; i++) {
            new Particle(
              getRandom(canvas.width / 8, canvas.width - canvas.width / 8),
              getRandom(-params.vx, params.vx),
              getRandom(params.vy / 2, params.vy * 2),
              params.size + Math.cos(frameId) * 100 // 크기를 시간에 따라 변화
            );
          }
        }
        for (let i in particles) {
          particles[i].draw();
        }

        frameId = requestAnimationFrame(loop);
        if (frameId % 2 === 0) {
          return;
        } // 60fps를 30fps로 만듦
      }

      loop();

      // 전체 화면 크기 조정
      window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });

      function getRandom(min, max) {
        return Math.random() * (max - min) + min;
      }
    })();
