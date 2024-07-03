class Slider {
  constructor() {
    this.bindAll();

    this.vert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;

    this.frag = `
    varying vec2 vUv;

    uniform sampler2D texture1;
    uniform sampler2D texture2;
    uniform sampler2D disp;

    uniform float dispPower;
    uniform float intensity;

    uniform vec2 size;
    uniform vec2 res;

    vec2 backgroundCoverUv( vec2 screenSize, vec2 imageSize, vec2 uv ) {
      float screenRatio = screenSize.x / screenSize.y;
      float imageRatio = imageSize.x / imageSize.y;
      vec2 newSize = screenRatio < imageRatio 
          ? vec2(imageSize.x * (screenSize.y / imageSize.y), screenSize.y)
          : vec2(screenSize.x, imageSize.y * (screenSize.x / imageSize.x));
      vec2 newOffset = (screenRatio < imageRatio 
          ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) 
          : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;
      return uv * screenSize / newSize + newOffset;
    }

    void main() {
      vec2 uv = vUv;
      
      vec4 disp = texture2D(disp, uv);
      vec2 dispVec = vec2(disp.x, disp.y);
      
      vec2 distPos1 = uv + (dispVec * intensity * dispPower);
      vec2 distPos2 = uv + (dispVec * -(intensity * (1.0 - dispPower)));
      
      vec4 _texture1 = texture2D(texture1, distPos1);
      vec4 _texture2 = texture2D(texture2, distPos2);
      
      gl_FragColor = mix(_texture1, _texture2, dispPower);
    }
    `;

    this.el = document.querySelector('.js-slider');
    this.inner = this.el.querySelector('.js-slider__inner');
    this.slides = [...this.el.querySelectorAll('.js-slide')];
    this.bullets = [...this.el.querySelectorAll('.js-slider-bullet')];

    this.renderer = null;
    this.scene = null;
    this.clock = null;
    this.camera = null;

    this.images = [
      'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/bg1.jpg',
      'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/bg2.jpg',
      'https://images.unsplash.com/photo-1708957127542-dd954b02702a?q=80&w=3774&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    ];

    this.data = {
      current: 0,
      next: 1,
      total: this.images.length - 1,
      delta: 0
    };

    this.state = {
      animating: false,
      text: false,
      initial: true
    };

    this.textures = null;

    this.init();
  }

  bindAll() {
    ['render', 'nextSlide', 'prevSlide', 'touchStart', 'touchMove', 'touchEnd']
      .forEach(fn => this[fn] = this[fn].bind(this));
  }

  setStyles() {
    this.slides.forEach((slide, index) => {
      if (index === 0) return;

      TweenMax.set(slide, { autoAlpha: 0 });
    });

    this.bullets.forEach((bullet, index) => {
      if (index === 0) return;

      const txt = bullet.querySelector('.js-slider-bullet__text');
      const line = bullet.querySelector('.js-slider-bullet__line');

      TweenMax.set(txt, {
        alpha: 0.25
      });

      TweenMax.set(line, {
        scaleX: 0,
        transformOrigin: 'left'
      });

    });
  }

  cameraSetup() {
    this.camera = new THREE.OrthographicCamera(
      this.el.offsetWidth / -2,
      this.el.offsetWidth / 2,
      this.el.offsetHeight / 2,
      this.el.offsetHeight / -2,
      1,
      1000);

    this.camera.lookAt(this.scene.position);
    this.camera.position.z = 1;
  }

  setup() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock(true);

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.el.offsetWidth, this.el.offsetHeight);

    this.inner.appendChild(this.renderer.domElement);
  }

  loadTextures() {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = '';

    this.textures = [];
    this.images.forEach((image, index) => {
      const texture = loader.load(image + '?v=' + Date.now(), this.render);

      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      if (index === 0 && this.mat) {
        this.mat.uniforms.size.value = [
          texture.image.naturalWidth,
          texture.image.naturalHeight
        ];
      }

      this.textures.push(texture);
    });

    this.disp = loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/rock-_disp.png', this.render);
    this.disp.magFilter = this.disp.minFilter = THREE.LinearFilter;
    this.disp.wrapS = this.disp.wrapT = THREE.RepeatWrapping;
  }

  createMesh() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        dispPower: { type: 'f', value: 0.0 },
        intensity: { type: 'f', value: 0.5 },
        res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        size: { value: new THREE.Vector2(1, 1) },
        texture1: { type: 't', value: this.textures[0] },
        texture2: { type: 't', value: this.textures[1] },
        disp: { type: 't', value: this.disp }
      },

      transparent: true,
      vertexShader: this.vert,
      fragmentShader: this.frag
    });

    const geometry = new THREE.PlaneBufferGeometry(
      this.el.offsetWidth,
      this.el.offsetHeight,
      1);

    const mesh = new THREE.Mesh(geometry, this.mat);

    this.scene.add(mesh);
  }

  transitionNext() {
    TweenMax.to(this.mat.uniforms.dispPower, 2.5, {
      value: 1,
      ease: Expo.easeInOut,
      onUpdate: this.render,
      onComplete: () => {
        this.mat.uniforms.dispPower.value = 0.0;
        this.changeTexture();
        this.render.bind(this);
        this.state.animating = false;
      }
    });

    const current = this.slides[this.data.current];
    const next = this.slides[this.data.next];

    const currentImages = current.querySelectorAll('.js-slide__img');
    const nextImages = next.querySelectorAll('.js-slide__img');

    const currentText = current.querySelectorAll('.js-slider__text-line div');
    const nextText = next.querySelectorAll('.js-slider__text-line div');

    const currentBullet = this.bullets[this.data.current];
    const nextBullet = this.bullets[this.data.next];

    const currentBulletTxt = currentBullet.querySelectorAll('.js-slider-bullet__text');
    const nextBulletTxt = nextBullet.querySelectorAll('.js-slider-bullet__text');

    const currentBulletLine = currentBullet.querySelectorAll('.js-slider-bullet__line');
    const nextBulletLine = nextBullet.querySelectorAll('.js-slider-bullet__line');

    const tl = new TimelineMax({ paused: true });

    if (this.state.initial) {
      TweenMax.to('.js-scroll', 1.5, {
        yPercent: 100,
        alpha: 0,
        ease: Power4.easeInOut
      });

      this.state.initial = false;
    }

    tl
      .staggerFromTo(currentImages, 1.5, {
        yPercent: 0,
        scale: 1
      }, {
        yPercent: 150,
        scaleY: 1.5,
        ease: Expo.easeInOut
      }, 0.075)
      .to(currentBulletTxt, 1.5, {
        alpha: 0.25,
        ease: Linear.easeNone
      }, 0)
      .set(currentBulletLine, {
        transformOrigin: 'right'
      }, 0)
      .to(currentBulletLine, 1.5, {
        scaleX: 0,
        ease: Expo.easeInOut
      }, 0);

    if (currentText) {
      tl
        .fromTo(currentText, 2, {
          yPercent: 0
        }, {
          yPercent: 100,
          ease: Power4.easeInOut
        }, 0);
    }

    tl
      .set(current, {
        autoAlpha: 0
      })
      .set(next, {
        autoAlpha: 1
      }, 1);

    if (nextText) {
      tl
        .fromTo(nextText, 2, {
          yPercent: -100
        }, {
          yPercent: 0,
          ease: Power4.easeOut
        }, 1.5);
    }

    tl
      .staggerFromTo(nextImages, 1.5, {
        yPercent: -185,
        scaleY: 1.5
      }, {
        yPercent: 0,
        scaleY: 1,
        ease: Expo.easeInOut
      }, 0.075, 1)
      .to(nextBulletTxt, 1.5, {
        alpha: 1,
        ease: Linear.easeNone
      }, 1)
      .set(nextBulletLine, {
        transformOrigin: 'left'
      }, 1)
      .to(nextBulletLine, 1.5, {
        scaleX: 1,
        ease: Expo.easeInOut
      }, 1);

    tl.play();
  }

  changeTexture() {
    this.mat.uniforms.texture1.value = this.textures[this.data.current];
    this.mat.uniforms.texture2.value = this.textures[this.data.next];
  }

  touchStart = (event) => {
    if (this.state.animating) return;

    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;

    this.el.addEventListener('touchmove', this.touchMove);
    this.el.addEventListener('touchend', this.touchEnd);
  }

  touchMove = (event) => {
    this.deltaX = event.touches[0].clientX - this.startX;
    this.deltaY = event.touches[0].clientY - this.startY;
  }

  touchEnd = () => {
    if (Math.abs(this.deltaY) > 50) {
      this.deltaY > 0 ? this.prevSlide() : this.nextSlide();
    }

    this.el.removeEventListener('touchmove', this.touchMove);
    this.el.removeEventListener('touchend', this.touchEnd);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  nextSlide() {
    if (this.state.animating) return;

    this.state.animating = true;

    this.transitionNext();

    this.data.current = this.data.current === this.data.total ? 0 : this.data.current + 1;
    this.data.next = this.data.current === this.data.total ? 0 : this.data.current + 1;
  }

  prevSlide() {
    if (this.state.animating) return;

    this.state.animating = true;

    TweenMax.to(this.mat.uniforms.dispPower, 2.5, {
      value: 1,
      ease: Expo.easeInOut,
      onUpdate: this.render,
      onComplete: () => {
        this.mat.uniforms.dispPower.value = 0.0;
        this.changeTexture();
        this.render.bind(this);
        this.state.animating = false;
      }
    });

    const current = this.slides[this.data.current];
    const prev = this.data.current === 0 ? this.slides[this.data.total] : this.slides[this.data.current - 1];

    const currentImages = current.querySelectorAll('.js-slide__img');
    const prevImages = prev.querySelectorAll('.js-slide__img');

    const currentText = current.querySelectorAll('.js-slider__text-line div');
    const prevText = prev.querySelectorAll('.js-slider__text-line div');

    const currentBullet = this.bullets[this.data.current];
    const prevBullet = this.bullets[this.data.current === 0 ? this.data.total : this.data.current - 1];

    const currentBulletTxt = currentBullet.querySelectorAll('.js-slider-bullet__text');
    const prevBulletTxt = prevBullet.querySelectorAll('.js-slider-bullet__text');

    const currentBulletLine = currentBullet.querySelectorAll('.js-slider-bullet__line');
    const prevBulletLine = prevBullet.querySelectorAll('.js-slider-bullet__line');

    const tl = new TimelineMax({ paused: true });

    if (this.state.initial) {
      TweenMax.to('.js-scroll', 1.5, {
        yPercent: 100,
        alpha: 0,
        ease: Power4.easeInOut
      });

      this.state.initial = false;
    }

    tl
      .staggerFromTo(currentImages, 1.5, {
        yPercent: 0,
        scale: 1
      }, {
        yPercent: 150,
        scaleY: 1.5,
        ease: Expo.easeInOut
      }, 0.075)
      .to(currentBulletTxt, 1.5, {
        alpha: 0.25,
        ease: Linear.easeNone
      }, 0)
      .set(currentBulletLine, {
        transformOrigin: 'right'
      }, 0)
      .to(currentBulletLine, 1.5, {
        scaleX: 0,
        ease: Expo.easeInOut
      }, 0);

    if (currentText) {
      tl
        .fromTo(currentText, 2, {
          yPercent: 0
        }, {
          yPercent: 100,
          ease: Power4.easeInOut
        }, 0);
    }

    tl
      .set(current, {
        autoAlpha: 0
      })
      .set(prev, {
        autoAlpha: 1
      }, 1);

    if (prevText) {
      tl
        .fromTo(prevText, 2, {
          yPercent: -100
        }, {
          yPercent: 0,
          ease: Power4.easeOut
        }, 1.5);
    }

    tl
      .staggerFromTo(prevImages, 1.5, {
        yPercent: -185,
        scaleY: 1.5
      }, {
        yPercent: 0,
        scaleY: 1,
        ease: Expo.easeInOut
      }, 0.075, 1)
      .to(prevBulletTxt, 1.5, {
        alpha: 1,
        ease: Linear.easeNone
      }, 1)
      .set(prevBulletLine, {
        transformOrigin: 'left'
      }, 1)
      .to(prevBulletLine, 1.5, {
        scaleX: 1,
        ease: Expo.easeInOut
      }, 1);

    tl.play();
    this.data.current = this.data.current === 0 ? this.data.total : this.data.current - 1;
    this.data.next = this.data.current === 0 ? this.data.total : this.data.current - 1;
  }

  init() {
    this.setStyles();
    this.setup();
    this.cameraSetup();
    this.loadTextures();
    this.createMesh();
    this.render();

    window.addEventListener('resize', this.render);

    this.el.addEventListener('touchstart', this.touchStart);
  }
}

new Slider();

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

  // GUI 생성
  let gui;
  function createGUI() {
    gui = new dat.GUI({ autoPlace: false }); // 자동으로 DOM에 추가되지 않도록 설정

    gui.add(params, 'amount', 1.0, 10).step(1);
    gui.addColor(params, 'bg_color');
    gui.add(params, 'vx', 1.0, 10).step(0.1);
    gui.add(params, 'vy', 1.0, 10).step(0.1);
    gui.add(params, 'size', 5, 1000).step(1);
    gui.add(params, 'hideGUI').onChange(updateGUIVisibility);

    // GUI를 custom-gui-container에 추가
    const guiContainer = document.getElementById('gui-container');
    guiContainer.appendChild(gui.domElement);
  }

  createGUI();

  // GUI 숨기기/보이기 함수
  function updateGUIVisibility(hide) {
    const guiContainer = document.getElementById('gui-container');
    if (hide) {
      guiContainer.classList.add('hidden');
    } else {
      guiContainer.classList.remove('hidden');
    }
  }

  // 애니메이션 루프
  const particles = [];
  let frameId = 0;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 화면 업데이트
    canvas.style.backgroundColor = params.bg_color; // 배경색 변경
    if (frameId % 3 === 0) {
      // 양을 제어
      for (let i = 0; i < params.amount; i++) {
        const particle = new Particle(
          getRandom(canvas.width / 8, canvas.width - canvas.width / 8),
          getRandom(-params.vx, params.vx),
          getRandom(params.vy / 2, params.vy * 2),
          params.size + Math.cos(frameId) * 100 // 크기를 시간에 따라 변화
        );
        particles.push(particle);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].draw();
      if (particles[i].life >= particles[i].maxlife) {
        particles.splice(i, 1);
      }
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
