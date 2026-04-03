(function () {
    'use strict';

    // ============================================
    // 全局变量
    // ============================================
    const loading = document.getElementById('loading');
    const progressFill = document.getElementById('progressFill');
    const loadingPercent = document.getElementById('loadingPercent');
    const topBar = document.getElementById('topBar');
    const menuToggle = document.getElementById('menuToggle');
    const sideNav = document.getElementById('sideNav');
    const sideNavMask = document.getElementById('sideNavMask');
    const sideNavClose = document.getElementById('sideNavClose');
    const mainContent = document.getElementById('mainContent');
    const playBtn = document.getElementById('playBtn');
    const videoModal = document.getElementById('videoModal');
    const modalClose = document.getElementById('modalClose');
    const trailerVideo = document.getElementById('trailerVideo');

    // Lenis 实例
    let lenis = null;

    // ============================================
    // 初始化
    // ============================================
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('[DEBUG] main.js 版本: 2026-04-03-v3');
        initLenis();
        initLoading();
        initNavigation();
        initVideoModal();
        initScrollEffects();
        initParallax();
        initAuthModal();
        initComments();
    }

    // ============================================
    // Lenis 惯性滚动
    // ============================================
    function initLenis() {
        lenis = new Lenis({
            duration: 1.8,           // 惯性持续时间
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // 缓动函数
            orientation: 'vertical', // 垂直滚动
            gestureOrientation: 'vertical',
            smoothWheel: true,       // 鼠标滚轮平滑
            wheelMultiplier: 1,      // 滚轮速度倍数
            touchMultiplier: 2,      // 触摸速度倍数
            infinite: false,
        });

        // 动画循环
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // ============================================
    // 加载动画
    // ============================================
    function initLoading() {
        // 加载期间停止滚动
        if (lenis) lenis.stop();

        // 需要预加载的所有图片列表
        const allImages = [
            '../assets/bg/forest_bg01.png',
            '../assets/bg/game_title.png',
            '../assets/characters/Character.png',
            '../assets/screenshots/screenshot_1.jpg',
            '../assets/screenshots/screenshot_2.jpg',
            '../assets/screenshots/screenshot_3.jpg',
            '../assets/screenshots/screenshot_4.jpg',
            '../assets/screenshots/screenshot_5.jpg',
            '../assets/screenshots/screenshot_6.jpg',
            ...Array.from({ length: 1749 }, (_, i) => `../assets/frames/frame_${String(i).padStart(6, '0')}.jpg`)
        ];

        let loadedCount = 0;
        let hasHidden = false;
        const totalImages = allImages.length;

        // 预加载所有图片
        allImages.forEach((src) => {
            const img = new Image();

            img.onload = () => {
                loadedCount++;
                updateProgress((loadedCount / totalImages) * 100);
                checkComplete();
            };

            img.onerror = () => {
                loadedCount++;
                updateProgress((loadedCount / totalImages) * 100);
                checkComplete();
            };

            img.src = src;
        });

        function checkComplete() {
            if (loadedCount >= totalImages && !hasHidden) {
                hasHidden = true;
                updateProgress(100);
                setTimeout(hideLoading, 300);
            }
        }
    }

    function updateProgress(value) {
        const percent = Math.min(100, Math.round(value));
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (loadingPercent) {
            loadingPercent.textContent = percent + '%';
        }
    }

    function hideLoading() {
        if (loading) {
            loading.classList.add('hidden');
            document.body.classList.add('loaded');
            // 确保 Lenis 滚动正常工作
            if (lenis) lenis.start();
        }
    }

    // ============================================
    // 导航栏交互
    // ============================================
    function initNavigation() {
        // 滚动时导航栏样式 - 使用 Lenis
        lenis.on('scroll', ({ scroll }) => {
            const scrollY = scroll;

            if (topBar) {
                if (scrollY > 50) {
                    topBar.classList.add('scrolled');
                } else {
                    topBar.classList.remove('scrolled');
                }
            }

            // 更新导航激活状态
            updateActiveNav(scrollY);
        });

        // 桌面导航点击
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // 检查是否是角色分段跳转
                const segmentIndex = item.dataset.segment;
                if (segmentIndex) {
                    // 更新激活状态
                    navItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    // 跳转到角色分段
                    scrollToSegment(parseInt(segmentIndex));
                } else if (item.dataset.section) {
                    const sectionId = item.dataset.section;
                    scrollToSection(sectionId);
                    // 更新激活状态
                    navItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });

        // 移动端菜单
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleSideNav);
            // 添加触摸支持
            menuToggle.addEventListener('touchend', (e) => {
                e.preventDefault();
                toggleSideNav();
            });
        }

        if (sideNavMask) {
            sideNavMask.addEventListener('click', closeSideNav);
            sideNavMask.addEventListener('touchend', (e) => {
                e.preventDefault();
                closeSideNav();
            });
        }

        if (sideNavClose) {
            sideNavClose.addEventListener('click', closeSideNav);
            sideNavClose.addEventListener('touchend', (e) => {
                e.preventDefault();
                closeSideNav();
            });
        }

        // 侧边导航链接 - 同时支持 click 和 touchend
        const sideNavItems = document.querySelectorAll('.side-nav-item');
        sideNavItems.forEach(item => {
            const handleNavClick = (e) => {
                const href = item.getAttribute('href');

                // 检查是否是角色分段跳转
                const segmentIndex = item.dataset.segment;
                if (segmentIndex) {
                    e.preventDefault();
                    closeSideNav();
                    setTimeout(() => {
                        scrollToSegment(parseInt(segmentIndex));
                    }, 100);
                    return;
                }

                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const sectionId = href.substring(1);
                    closeSideNav();
                    // 延迟执行滚动，确保菜单关闭动画完成
                    setTimeout(() => {
                        scrollToSection(sectionId);
                    }, 100);
                }
            };

            item.addEventListener('click', handleNavClick);
            item.addEventListener('touchend', handleNavClick);
        });
    }

    function toggleSideNav() {
        const isOpen = sideNav.classList.toggle('open');
        if (menuToggle) {
            menuToggle.classList.toggle('active');
        }
        // 控制滚动
        if (isOpen) {
            if (lenis) lenis.stop();
        } else {
            if (lenis) lenis.start();
        }
    }

    function closeSideNav() {
        if (sideNav) {
            sideNav.classList.remove('open');
        }
        if (menuToggle) {
            menuToggle.classList.remove('active');
        }
        // 恢复滚动
        if (lenis) lenis.start();
    }

    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const topBarHeight = topBar ? topBar.offsetHeight : 0;
            const targetPosition = section.offsetTop - topBarHeight;
            // 跳转时禁用惯性，瞬间到达
            lenis.scrollTo(targetPosition, { immediate: true });
        }
    }

    function updateActiveNav(scrollY) {
        const sections = document.querySelectorAll('section[id]');
        const topBarHeight = topBar ? topBar.offsetHeight : 0;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - topBarHeight - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                // 检查是否是角色区域
                if (sectionId === 'characters') {
                    // 在角色区域时，根据当前分段更新对应角色导航项
                    const segmentIndex = window.currentSegmentIndex;
                    if (segmentIndex && segmentIndex >= 1 && segmentIndex <= 5) {
                        document.querySelectorAll('.nav-item[data-segment]').forEach(item => {
                            item.classList.remove('active');
                            if (parseInt(item.dataset.segment) === segmentIndex) {
                                item.classList.add('active');
                            }
                        });
                    }
                } else {
                    // 其他区域按section更新
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                        if (item.dataset.section === sectionId) {
                            item.classList.add('active');
                        }
                    });
                }
            }
        });
    }

    // ============================================
    // 视频弹窗
    // ============================================
    function initVideoModal() {
        if (!playBtn || !videoModal || !trailerVideo) return;

        playBtn.addEventListener('click', openVideoModal);

        if (modalClose) {
            modalClose.addEventListener('click', closeVideoModal);
        }

        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('active')) {
                closeVideoModal();
            }
        });
    }

    function openVideoModal() {
        if (videoModal) {
            videoModal.classList.add('active');
            // 停止 Lenis 滚动
            if (lenis) lenis.stop();
            if (trailerVideo) {
                trailerVideo.play().catch(console.error);
            }
        }
    }

    function closeVideoModal() {
        if (videoModal) {
            videoModal.classList.remove('active');
            // 恢复 Lenis 滚动
            if (lenis) lenis.start();
            if (trailerVideo) {
                trailerVideo.pause();
                trailerVideo.currentTime = 0;
            }
        }
    }

    // ============================================
    // 滚动动画
    // ============================================
    function initScrollEffects() {
        const observerOptions = {
            root: null,
            rootMargin: '-50px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // 观察需要动画的元素
        const animatedElements = document.querySelectorAll(
            '.character-card, .gallery-item, .feature-card'
        );

        animatedElements.forEach((el, index) => {
            el.style.transitionDelay = `${index * 0.1}s`;
            observer.observe(el);
        });
    }

    // ============================================
    // 视差效果 - Canvas逐帧淡出
    // ============================================
    let homeCanvas = null;
    let homeCtx = null;
    let homeBgImg = null;
    let homeAnimationId = null;
    let homeOpacity = 1;
    let homeScale = 1;
    let homeTranslateY = 0;

    function initParallax() {
        homeCanvas = document.getElementById('homeCanvas');
        const homeSection = document.getElementById('home');
        const homeContent = document.querySelector('.home-content');
        const characterShow = document.querySelector('.character-show');
        const scrollHint = document.querySelector('.scroll-hint');

        if (!homeCanvas) return;

        homeCtx = homeCanvas.getContext('2d');

        // 加载背景图
        homeBgImg = new Image();
        homeBgImg.src = '../assets/bg/forest_bg01.png';
        homeBgImg.onload = () => {
            resizeHomeCanvas();
            drawHomeCanvas();
        };

        // 设置Canvas尺寸 - 保持16:9比例
        function resizeHomeCanvas() {
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const targetRatio = 16 / 9;
            const containerRatio = containerWidth / containerHeight;

            let canvasWidth, canvasHeight;

            if (containerRatio > targetRatio) {
                // 容器更宽，以高度为准
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * targetRatio;
            } else {
                // 容器更高，以宽度为准
                canvasWidth = containerWidth;
                canvasHeight = canvasWidth / targetRatio;
            }

            // 设置Canvas实际像素尺寸
            homeCanvas.width = canvasWidth;
            homeCanvas.height = canvasHeight;

            // 通过CSS让Canvas居中显示
            homeCanvas.style.width = canvasWidth + 'px';
            homeCanvas.style.height = canvasHeight + 'px';
        }

        resizeHomeCanvas();
        window.addEventListener('resize', () => {
            resizeHomeCanvas();
            drawHomeCanvas();
        });

        // 使用 Lenis 滚动事件
        lenis.on('scroll', ({ scroll }) => {
            const scrollY = scroll;
            const maxScroll = window.innerHeight;

            // 只在首页区域应用视差
            if (scrollY < maxScroll) {
                const progress = scrollY / maxScroll;

                // 逐帧淡出参数
                homeScale = 1 + progress * 0.1;
                homeTranslateY = progress * 50;

                // 淡出进度 - 滚动到80%时完全消失
                const fadeProgress = Math.min(1, progress / 0.8);
                homeOpacity = 1 - fadeProgress;

                // 绘制Canvas（只做缩放和位移）
                drawHomeCanvas();

                // 统一通过home-section控制所有元素淡出
                if (homeSection) {
                    homeSection.style.setProperty('opacity', homeOpacity, 'important');
                }

                // home-content额外加位移动画
                if (homeContent) {
                    homeContent.style.transform = `translateY(${scrollY * 0.3}px)`;
                }
            }
        });
    }

    // 绘制首页Canvas
    function drawHomeCanvas() {
        if (!homeCtx || !homeCanvas || !homeBgImg) return;

        // 清空
        homeCtx.clearRect(0, 0, homeCanvas.width, homeCanvas.height);

        // Canvas已经是16:9比例，计算图片如何铺满
        const imgRatio = homeBgImg.width / homeBgImg.height;
        const canvasRatio = homeCanvas.width / homeCanvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        // 使用cover模式 - 图片完全覆盖Canvas
        if (imgRatio > canvasRatio) {
            // 图片更宽，以高度为准
            drawHeight = homeCanvas.height * 1.1;
            drawWidth = drawHeight * imgRatio;
        } else {
            // 图片更高，以宽度为准
            drawWidth = homeCanvas.width * 1.1;
            drawHeight = drawWidth / imgRatio;
        }

        // 应用缩放和位移
        drawWidth *= homeScale;
        drawHeight *= homeScale;

        drawX = (homeCanvas.width - drawWidth) / 2;
        drawY = (homeCanvas.height - drawHeight) / 2 + homeTranslateY;

        // 绘制（带暗角效果）
        homeCtx.filter = 'brightness(0.5)';
        homeCtx.drawImage(homeBgImg, drawX, drawY, drawWidth, drawHeight);
        homeCtx.filter = 'none';
    }

    // ============================================
    // 逐帧动画 - 分段播放
    // ============================================
    let frameCanvas = null;
    let frameCtx = null;
    let frameContainer = null;
    let charactersSection = null;
    let segmentIndicator = null;
    let currentCharacterInfo = null;

    // 帧配置
    const TOTAL_FRAMES = 1750;
    const FRAME_PATH = '../assets/frames/frame_';
    const FRAME_STEP = 2; // 每2帧加载一个关键帧，更流畅

    // 分段配置
    const SEGMENTS = [
        { name: '前段', startFrame: 0, endFrame: 291 },
        { name: '莉莉丝', startFrame: 292, endFrame: 492 },
        { name: '卡莲', startFrame: 493, endFrame: 683 },
        { name: '弗子', startFrame: 684, endFrame: 850 },
        { name: '夏特露', startFrame: 851, endFrame: 1015 },
        { name: '格林', startFrame: 1016, endFrame: 1158 },
        { name: '后段', startFrame: 1159, endFrame: 1749 }
    ];

    // 角色数据
    const CHARACTER_DATA = {
        1: {
            nameEn: 'LILITH',
            nameCn: '莉莉丝',
            dialog: '「我叫莉莉丝，一名魔剑士——在商业之里，像你这样的好人可不多了。」',
            desc: '银葱之森的神秘美少女，是一位略懂些魔法技艺的剑士，自称要打败魔王赢得众人的欢呼——不过目前的当务之急是抢购打折面包。'
        },
        2: {
            nameEn: 'KAREN',
            nameCn: '卡莲',
            dialog: '「自求多福吧，我不会再救你一次了。」',
            desc: '在吹灭15岁生日蜡烛之前，卡莲无疑是这世界上最幸福的女孩。直到那天，她许下了一个离开城堡的愿望。'
        },
        3: {
            nameEn: 'FUJIKO',
            nameCn: '弗子',
            dialog: '「原来如此，积跬步，至千里……勇者，你已经考虑如此细致了。」',
            desc: '每天24h工作制，睁眼就是例行会议。她放弃了作为魔王的职责，但接任者的黑暗统治让她陷入了深深的自责。'
        },
        4: {
            nameEn: 'SHATRE',
            nameCn: '夏特露',
            dialog: '「我突然对你感兴趣了，你就来做我的研究对象吧！」',
            desc: '作为从小就在赞叹中长大的「真理之桥」，夏特露的人生无疑是一帆风顺。她需要大量的时间不停计算与推演。'
        },
        5: {
            nameEn: 'GRIN',
            nameCn: '格林',
            dialog: '「在下格林，在这片林子里讨生活的猎户。」',
            desc: '「打败魔王，成为英雄」是格林自年幼以来的梦想。作为最年轻的格里芬情报对策科探员，一次任务中的「意外」改变了一切。'
        }
    };

    // 状态变量
    let frameImages = {};
    let currentFrame = 0;
    let targetFrame = 0;
    let rafId = null;
    let lastDrawTime = 0;
    let currentSegmentIndex = 0;

    // 初始化逐帧动画
    function initFrameAnimation() {
        frameCanvas = document.getElementById('frameCanvas');
        frameContainer = document.querySelector('.frame-animation-container');
        charactersSection = document.getElementById('characters');
        segmentIndicator = document.getElementById('segmentIndicator');
        currentCharacterInfo = document.getElementById('currentCharacterInfo');

        if (!frameCanvas || !frameContainer || !charactersSection) {
            console.error('逐帧动画元素未找到');
            return;
        }

        frameCtx = frameCanvas.getContext('2d');

        // 设置Canvas尺寸 - 保持16:9比例
        function resizeCanvas() {
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const targetRatio = 16 / 9;
            const containerRatio = containerWidth / containerHeight;

            let canvasWidth, canvasHeight;

            if (containerRatio > targetRatio) {
                // 容器更宽，以高度为准
                canvasHeight = containerHeight;
                canvasWidth = canvasHeight * targetRatio;
            } else {
                // 容器更高，以宽度为准
                canvasWidth = containerWidth;
                canvasHeight = canvasWidth / targetRatio;
            }

            // 设置Canvas实际像素尺寸
            frameCanvas.width = canvasWidth;
            frameCanvas.height = canvasHeight;

            // 通过CSS让Canvas居中显示
            frameCanvas.style.width = canvasWidth + 'px';
            frameCanvas.style.height = canvasHeight + 'px';
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 加载所有关键帧
        loadAllFrames();

        // 使用 Lenis 监听滚动
        lenis.on('scroll', handleFrameScroll);

        // 分段点击事件
        initSegmentClick();
    }

    // 初始化分段点击
    function initSegmentClick() {
        const items = document.querySelectorAll('.segment-item');
        items.forEach((item) => {
            item.addEventListener('click', () => {
                const segmentIndex = parseInt(item.dataset.segment);
                scrollToSegment(segmentIndex);
            });
        });
    }

    // 滚动到指定分段
    function scrollToSegment(segmentIndex) {
        const seg = SEGMENTS[segmentIndex];
        if (!seg || !charactersSection) return;

        // 计算该分段的起始帧对应的滚动位置
        const rect = charactersSection.getBoundingClientRect();
        const totalScroll = rect.height - window.innerHeight;

        // 计算该帧对应的进度
        let totalSpan = 0;
        SEGMENTS.forEach(s => {
            totalSpan += (s.endFrame - s.startFrame + 1);
        });

        let accumulated = 0;
        for (let i = 0; i < segmentIndex; i++) {
            accumulated += (SEGMENTS[i].endFrame - SEGMENTS[i].startFrame + 1);
        }
        // 跳到分段中间
        accumulated += (seg.endFrame - seg.startFrame + 1) / 2;

        const targetProgress = accumulated / totalSpan;
        const scrollPosition = charactersSection.offsetTop + targetProgress * totalScroll - window.innerHeight / 2;

        // 使用 Lenis scrollTo，瞬间跳转
        lenis.scrollTo(scrollPosition, { immediate: true });
    }

    // 加载所有关键帧
    function loadAllFrames() {
        let loadedCount = 0;
        const totalToLoad = Math.ceil(TOTAL_FRAMES / FRAME_STEP);

        for (let i = 0; i < TOTAL_FRAMES; i += FRAME_STEP) {
            const img = new Image();
            const frameNum = String(i).padStart(6, '0');
            img.src = FRAME_PATH + frameNum + '.jpg';

            const frameIndex = i;

            img.onload = () => {
                frameImages[frameIndex] = img;
                loadedCount++;

                // 第一帧加载完成后立即显示
                if (loadedCount === 1) {
                    drawFrame(0);
                }
            };
        }
    }

    // 处理滚动 - Lenis 滚动事件
    function handleFrameScroll({ scroll }) {
        if (!charactersSection || !frameContainer) return;

        const rect = charactersSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 检查是否在角色区域内
        const isInView = rect.top < viewportHeight && rect.bottom > 0;

        if (isInView) {
            frameContainer.classList.add('active');
            if (segmentIndicator) {
                segmentIndicator.classList.add('active');
            }

            // 计算滚动进度 (0-1)
            const totalScroll = rect.height - viewportHeight;
            const scrolled = viewportHeight - rect.top;
            const progress = Math.max(0, Math.min(1, scrolled / totalScroll));

            // 根据分段计算目标帧
            targetFrame = getFrameFromProgress(progress);
            targetFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, targetFrame));

            // 更新当前分段索引
            updateCurrentSegment(targetFrame);

            // 启动动画循环
            if (!rafId) {
                animateLoop();
            }
        } else {
            frameContainer.classList.remove('active');
            if (segmentIndicator) {
                segmentIndicator.classList.remove('active');
            }
        }
    }

    // 根据进度计算帧数
    function getFrameFromProgress(progress) {
        // 计算总帧跨度
        let totalSpan = 0;
        SEGMENTS.forEach(seg => {
            totalSpan += (seg.endFrame - seg.startFrame + 1);
        });

        // 计算目标帧位置
        const targetPosition = progress * totalSpan;

        // 找到对应的分段和帧
        let accumulated = 0;
        for (let i = 0; i < SEGMENTS.length; i++) {
            const seg = SEGMENTS[i];
            const segSpan = seg.endFrame - seg.startFrame + 1;

            if (accumulated + segSpan >= targetPosition) {
                // 在这个分段内
                const segProgress = (targetPosition - accumulated) / segSpan;
                return Math.floor(seg.startFrame + segProgress * segSpan);
            }
            accumulated += segSpan;
        }

        return TOTAL_FRAMES - 1;
    }

    // 更新当前分段索引
    function updateCurrentSegment(frameIndex) {
        const prevIndex = currentSegmentIndex;
        for (let i = 0; i < SEGMENTS.length; i++) {
            const seg = SEGMENTS[i];
            if (frameIndex >= seg.startFrame && frameIndex <= seg.endFrame) {
                currentSegmentIndex = i;
                break;
            }
        }
        // 如果分段变化，更新导航栏激活状态
        if (prevIndex !== currentSegmentIndex) {
            // 将角色分段索引暴露到全局（1-5对应莉莉丝-格林）
            window.currentSegmentIndex = currentSegmentIndex;
            // 更新导航栏中角色项的激活状态
            updateNavSegmentActive(currentSegmentIndex);
        }
    }

    // 更新导航栏中角色项的激活状态
    function updateNavSegmentActive(segmentIndex) {
        // 更新桌面导航
        document.querySelectorAll('.nav-item[data-segment]').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.segment) === segmentIndex) {
                item.classList.add('active');
            }
        });
        // 更新侧边导航
        document.querySelectorAll('.side-nav-item[data-segment]').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.segment) === segmentIndex) {
                item.classList.add('active');
            }
        });
    }

    // 动画循环
    function animateLoop() {
        const diff = targetFrame - currentFrame;

        // 更快的帧切换 - 直接跳到目标帧附近
        if (Math.abs(diff) > 2) {
            currentFrame += diff * 0.5; // 提高到0.5，更快响应
        } else {
            currentFrame = targetFrame;
        }

        // 绘制
        drawFrame(Math.round(currentFrame));

        // 检查是否还在视图内
        if (frameContainer && frameContainer.classList.contains('active')) {
            rafId = requestAnimationFrame(animateLoop);
        } else {
            rafId = null;
        }
    }

    // 绘制帧
    function drawFrame(frameIndex) {
        if (!frameCtx || !frameCanvas) return;

        // 找到最近的关键帧
        const keyFrame = Math.floor(frameIndex / FRAME_STEP) * FRAME_STEP;

        let img = frameImages[keyFrame];

        // 如果关键帧不存在，找最近的
        if (!img) {
            const keys = Object.keys(frameImages).map(Number).sort((a, b) => Math.abs(a - keyFrame) - Math.abs(b - keyFrame));
            if (keys.length > 0) {
                img = frameImages[keys[0]];
            }
        }

        // 清空Canvas
        frameCtx.fillStyle = '#000000';
        frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);

        if (!img || !img.complete) return;

        // 计算绘制尺寸 - 铺满整个Canvas（16:9）
        const canvasRatio = frameCanvas.width / frameCanvas.height;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, drawX, drawY;

        // 使用cover模式 - 图片完全覆盖Canvas
        if (imgRatio > canvasRatio) {
            // 图片更宽，以高度为准
            drawHeight = frameCanvas.height;
            drawWidth = drawHeight * imgRatio;
            drawX = (frameCanvas.width - drawWidth) / 2;
            drawY = 0;
        } else {
            // 图片更高，以宽度为准
            drawWidth = frameCanvas.width;
            drawHeight = drawWidth / imgRatio;
            drawX = 0;
            drawY = (frameCanvas.height - drawHeight) / 2;
        }

        frameCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 绘制角色信息 - 逐帧飞入动画
        drawCharacterInfo(frameIndex);
    }

    // 绘制角色信息 - 逐帧飞入
    function drawCharacterInfo(frameIndex) {
        const charData = CHARACTER_DATA[currentSegmentIndex];
        if (!charData) return; // 前段和后段不显示

        const seg = SEGMENTS[currentSegmentIndex];
        const segTotal = seg.endFrame - seg.startFrame + 1;
        const segProgress = (frameIndex - seg.startFrame) / segTotal; // 0-1 分段内进度

        // 飞入动画配置
        const flyInEnd = 0.15; // 前15%完成飞入
        const flyOutStart = 0.85; // 后15%开始飞出

        let textX;
        let opacity = 1;

        // 判断是左侧还是右侧
        const isRight = currentSegmentIndex === 2 || currentSegmentIndex === 4;

        // 计算位置和透明度
        if (segProgress < flyInEnd) {
            // 飞入阶段
            const flyProgress = segProgress / flyInEnd; // 0-1
            const easeProgress = easeOutCubic(flyProgress);

            if (isRight) {
                // 从右往左飞
                textX = frameCanvas.width + 200 - easeProgress * (frameCanvas.width + 200 - (frameCanvas.width - 450));
            } else {
                // 从左往右飞
                textX = -450 + easeProgress * (450 + 60);
            }
            opacity = easeProgress;
        } else if (segProgress > flyOutStart) {
            // 飞出阶段
            const flyProgress = (segProgress - flyOutStart) / (1 - flyOutStart); // 0-1
            const easeProgress = easeInCubic(flyProgress);

            if (isRight) {
                // 往右飞出
                textX = (frameCanvas.width - 450) + easeProgress * 500;
            } else {
                // 往左飞出
                textX = 60 - easeProgress * 500;
            }
            opacity = 1 - easeProgress;
        } else {
            // 静止阶段
            textX = isRight ? (frameCanvas.width - 450) : 60;
        }

        // 绘制文字
        const baseY = frameCanvas.height - 250;

        frameCtx.save();
        frameCtx.globalAlpha = opacity;

        // 文字描边样式
        const strokeStyle = 'rgba(0, 0, 0, 0.8)';

        // 英文名
        frameCtx.font = '600 14px "Noto Sans SC", sans-serif';
        frameCtx.fillStyle = '#D62032';
        frameCtx.strokeStyle = strokeStyle;
        frameCtx.lineWidth = 3;
        frameCtx.strokeText(charData.nameEn, textX, baseY);
        frameCtx.fillText(charData.nameEn, textX, baseY);

        // 中文名
        frameCtx.font = '700 32px "Noto Sans SC", sans-serif';
        frameCtx.fillStyle = '#f0f0f0';
        frameCtx.strokeStyle = strokeStyle;
        frameCtx.lineWidth = 4;
        frameCtx.strokeText(charData.nameCn, textX, baseY + 35);
        frameCtx.fillText(charData.nameCn, textX, baseY + 35);

        // 对话
        frameCtx.font = 'italic 15px "Noto Sans SC", sans-serif';
        frameCtx.fillStyle = '#e8e8e8';
        frameCtx.strokeStyle = strokeStyle;
        frameCtx.lineWidth = 3;
        const dialogX = textX + 3;
        const dialogY = baseY + 65;

        // 绘制对话背景线
        frameCtx.strokeStyle = '#D62032';
        frameCtx.lineWidth = 3;
        frameCtx.beginPath();
        frameCtx.moveTo(textX, dialogY - 15);
        frameCtx.lineTo(textX, dialogY + 40);
        frameCtx.stroke();

        // 绘制对话文字（自动换行，带描边）
        wrapText(frameCtx, charData.dialog, dialogX, dialogY, 380, 22, strokeStyle);

        // 描述
        frameCtx.font = '14px "Noto Sans SC", sans-serif';
        frameCtx.fillStyle = '#d0d0d0';
        wrapText(frameCtx, charData.desc, textX, dialogY + 60, 400, 22, strokeStyle);

        frameCtx.restore();
    }

    // 文字自动换行（支持描边）
    function wrapText(ctx, text, x, y, maxWidth, lineHeight, strokeStyle = null) {
        const chars = text.split('');
        let line = '';
        let currentY = y;

        for (let i = 0; i < chars.length; i++) {
            const testLine = line + chars[i];
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && line.length > 0) {
                // 先绘制描边
                if (strokeStyle) {
                    ctx.strokeStyle = strokeStyle;
                    ctx.lineWidth = 3;
                    ctx.strokeText(line, x, currentY);
                }
                ctx.fillText(line, x, currentY);
                line = chars[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        // 绘制最后一行
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 3;
            ctx.strokeText(line, x, currentY);
        }
        ctx.fillText(line, x, currentY);
    }

    // 缓动函数
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeInCubic(t) {
        return t * t * t;
    }

    // ============================================
    // 登录/注册弹窗
    // ============================================
    function initAuthModal() {
        const authModal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const authClose = document.getElementById('authClose');
        const authTabs = document.querySelectorAll('.auth-tab');
        const authForms = document.querySelectorAll('.auth-form');
        const tabIndicator = document.querySelector('.auth-tab-indicator');
        const togglePasswordBtns = document.querySelectorAll('.toggle-password');

        if (!authModal) return;

        // 打开弹窗
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                authModal.classList.add('active');
                if (lenis) lenis.stop();
            });
        }

        // 关闭弹窗
        const closeModal = () => {
            authModal.classList.remove('active');
            if (lenis) lenis.start();
        };

        if (authClose) {
            authClose.addEventListener('click', closeModal);
        }

        // 点击背景关闭
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeModal();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && authModal.classList.contains('active')) {
                closeModal();
            }
        });

        // 标签切换
        authTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                authForms.forEach(f => f.classList.remove('active'));
                authForms[index].classList.add('active');

                // 移动指示器
                if (tabIndicator) {
                    tabIndicator.style.transform = `translateX(${index * 100}%)`;
                }
            });
        });

        // 密码可见性切换
        togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('.form-input');
                const eyeOpen = btn.querySelector('.eye-open');
                const eyeClosed = btn.querySelector('.eye-closed');

                if (input.type === 'password') {
                    input.type = 'text';
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                } else {
                    input.type = 'password';
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                }
            });
        });

        // 密码强度检测
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            const passwordInputs = registerForm.querySelectorAll('.form-input[type="password"]');
            passwordInputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const strength = checkPasswordStrength(value);
                    const strengthFill = registerForm.querySelector('.strength-fill');
                    const strengthText = registerForm.querySelector('.strength-text');

                    if (strengthFill && strengthText) {
                        strengthFill.setAttribute('data-strength', strength.level);
                        strengthText.textContent = `密码强度：${strength.text}`;
                    }
                });
            });
        }

        // 登录表单提交
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = loginForm.querySelector('.auth-submit-btn');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span>处理中...</span>';
                submitBtn.disabled = true;

                const formData = new FormData(loginForm);
                const inputs = loginForm.querySelectorAll('.form-input');

                try {
                    const response = await fetch('https://persnickety-defunctive-ceola.ngrok-free.dev/login', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    const result = await response.json();

                    if (result.suc) {
                        // 保存 token 到 localStorage
                        console.log('登录返回结果:', result);
                        if (result.token) {
                            localStorage.setItem('auth_token', result.token);
                            console.log('Token 已保存:', result.token);
                        } else {
                            console.log('警告: 登录成功但没有返回 token');
                        }
                        showAuthMessage(result.mes, 'success');
                        closeModal();
                        updateLoginUI(result.username || formData.get('username'));
                    } else {
                        showAuthMessage(result.mes, 'error');
                    }
                } catch (error) {
                    showAuthMessage('网络错误，请检查后端服务是否启动', 'error');
                }

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        }

        // 注册表单提交
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = registerForm.querySelector('.auth-submit-btn');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span>处理中...</span>';
                submitBtn.disabled = true;

                const formData = new FormData(registerForm);
                const password = formData.get('password');
                const confirmPassword = formData.get('confirm_password');

                // 验证密码
                if (password !== confirmPassword) {
                    showAuthMessage('两次输入的密码不一致', 'error');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                try {
                    const response = await fetch('https://persnickety-defunctive-ceola.ngrok-free.dev/register', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    const result = await response.json();

                    if (result.suc) {
                        showAuthMessage(result.mes, 'success');
                        // 切换到登录标签
                        const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
                        if (loginTab) loginTab.click();
                    } else {
                        showAuthMessage(result.mes, 'error');
                    }
                } catch (error) {
                    showAuthMessage('网络错误，请检查后端服务是否启动', 'error');
                }

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        }
    }

    // 显示认证消息提示
    function showAuthMessage(message, type) {
        // 移除已存在的消息
        const existingMsg = document.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();

        const msgEl = document.createElement('div');
        msgEl.className = `auth-message ${type}`;
        msgEl.textContent = message;
        document.body.appendChild(msgEl);

        setTimeout(() => {
            msgEl.classList.add('show');
        }, 10);

        setTimeout(() => {
            msgEl.classList.remove('show');
            setTimeout(() => msgEl.remove(), 300);
        }, 3000);
    }

    // 更新登录后的UI
    function updateLoginUI(username) {
        // 存储当前用户信息（用于评论功能判断拥有者）
        currentUser = { username: username };
        localStorage.setItem('username', username);

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                ${username}
            `;
            loginBtn.classList.add('logged-in');

            // 点击已登录用户显示退出选项
            loginBtn.onclick = () => {
                if (confirm('确定要退出登录吗？')) {
                    logout();
                }
            };
        }

        // 登录后刷新评论列表以显示删除按钮
        if (typeof loadComments === 'function') {
            loadComments();
        }
    }

    // 退出登录
    async function logout() {
        const token = localStorage.getItem('auth_token');
        try {
            await fetch('https://persnickety-defunctive-ceola.ngrok-free.dev/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('退出登录失败:', error);
        }

        // 清除 token 和用户信息
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        currentUser = null;

        // 重置UI
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                登录
            `;
            loginBtn.classList.remove('logged-in');
            loginBtn.onclick = null;
        }

        // 退出后刷新评论列表以隐藏删除按钮
        if (typeof loadComments === 'function') {
            loadComments();
        }
    }

    // 密码强度检测函数
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) {
            return { level: 'weak', text: '弱' };
        } else if (score <= 3) {
            return { level: 'medium', text: '中等' };
        } else {
            return { level: 'strong', text: '强' };
        }
    }

    // ============================================
    // 评论区交互 - 完整功能
    // ============================================
    const API_BASE_URL = 'https://persnickety-defunctive-ceola.ngrok-free.dev';
    let currentUser = null; // 当前登录用户信息

    // 页面加载时检查是否有保存的登录状态
    function checkStoredLogin() {
        const token = localStorage.getItem('auth_token');
        const savedUsername = localStorage.getItem('username');
        if (token && savedUsername) {
            currentUser = { username: savedUsername };
            updateLoginUI(savedUsername);
        }
    }

    function initComments() {
        // 检查保存的登录状态
        checkStoredLogin();

        const commentTextarea = document.querySelector('.comment-textarea');
        const charCount = document.querySelector('.char-count');
        const submitCommentBtn = document.getElementById('submitComment');
        const sortBtns = document.querySelectorAll('.sort-btn');

        // 初始化时加载评论列表
        loadComments();

        // 字数统计
        if (commentTextarea && charCount) {
            commentTextarea.addEventListener('input', () => {
                const length = commentTextarea.value.length;
                charCount.textContent = `${length}/500`;

                if (length > 500) {
                    charCount.style.color = 'var(--accent-red)';
                } else {
                    charCount.style.color = 'var(--text-muted)';
                }
            });
        }

        // 提交评论
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', async () => {
                if (!commentTextarea || !commentTextarea.value.trim()) {
                    showCommentMessage('请输入评论内容', 'error');
                    return;
                }

                const content = commentTextarea.value.trim();
                const originalHTML = submitCommentBtn.innerHTML;
                submitCommentBtn.innerHTML = '<span>提交中...</span>';
                submitCommentBtn.disabled = true;

                try {
                    const formData = new FormData();
                    formData.append('content', content);

                    const token = localStorage.getItem('auth_token');
                    console.log('评论时的 token:', token);
                    console.log('当前 localStorage:', localStorage);
                    
                    const response = await fetch(`${API_BASE_URL}/comment`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const result = await response.json();
                    console.log('评论返回结果:', result);

                    if (result.suc) {
                        showCommentMessage(result.mes, 'success');
                        commentTextarea.value = '';
                        charCount.textContent = '0/500';
                        // 重新加载评论列表
                        loadComments();
                    } else {
                        showCommentMessage(result.mes, 'error');
                    }
                } catch (error) {
                    showCommentMessage('网络错误，请检查后端服务是否启动', 'error');
                }

                submitCommentBtn.innerHTML = originalHTML;
                submitCommentBtn.disabled = false;
            });
        }

        // 排序切换
        sortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadComments(btn.dataset.sort);
            });
        });
    }

    // 加载评论列表
    async function loadComments(sortType = 'newest') {
        const commentsList = document.querySelector('.comments-list');
        if (!commentsList) {
            console.log('[DEBUG] comments-list 元素不存在');
            return;
        }

        try {
            console.log('[DEBUG] 正在加载评论...');
            const response = await fetch(`${API_BASE_URL}/comments`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            const result = await response.json();
            console.log('[DEBUG] 评论数据:', result);

            if (result.suc && result.comments) {
                let comments = result.comments;
                console.log('[DEBUG] 评论数量:', comments.length);

                // 排序处理
                if (sortType === 'newest') {
                    comments.sort((a, b) => new Date(b.cat) - new Date(a.cat));
                }

                renderComments(comments);
            }
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    }

    // 渲染评论列表
    function renderComments(comments) {
        const commentsList = document.querySelector('.comments-list');
        if (!commentsList) {
            console.log('[DEBUG] renderComments: comments-list 元素不存在');
            return;
        }

        console.log('[DEBUG] renderComments: 渲染', comments.length, '条评论');

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <p>暂无评论，快来发表第一条评论吧！</p>
                </div>
            `;
            return;
        }

        const html = comments.map(comment => {
            const timeAgo = formatTimeAgo(comment.cat);
            const isOwner = currentUser && currentUser.username === comment.cname;

            return `
                <div class="comment-item" data-id="${comment.id}">
                    <div class="comment-avatar">
                        <img src="../assets/favicon.ico" alt="用户头像" class="avatar-img">
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${escapeHtml(comment.cname)}</span>
                            <span class="comment-time">${timeAgo}</span>
                        </div>
                        <p class="comment-text">${escapeHtml(comment.con)}</p>
                        <div class="comment-footer">
                            <button class="comment-action-btn like-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                                </svg>
                                <span>0</span>
                            </button>
                            ${isOwner ? `
                                <button class="comment-action-btn delete-btn" onclick="deleteComment(${comment.id})">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                    <span>删除</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        commentsList.innerHTML = html;
        console.log('[DEBUG] renderComments: HTML 已更新');

        // 绑定点赞事件
        const likeBtns = commentsList.querySelectorAll('.like-btn');
        likeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const countSpan = btn.querySelector('span');
                if (!countSpan) return;

                const isLiked = btn.classList.toggle('liked');
                let count = parseInt(countSpan.textContent);

                if (isLiked) {
                    countSpan.textContent = count + 1;
                } else {
                    countSpan.textContent = count - 1;
                }
            });
        });
    }

    // 删除评论
    async function deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/del_comment/${commentId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (result.suc) {
                showCommentMessage(result.mes, 'success');
                loadComments();
            } else {
                showCommentMessage(result.mes, 'error');
            }
        } catch (error) {
            showCommentMessage('网络错误，删除失败', 'error');
        }
    }

    // 将删除函数暴露到全局
    window.deleteComment = deleteComment;

    // 显示评论消息提示
    function showCommentMessage(message, type) {
        const existingMsg = document.querySelector('.comment-message');
        if (existingMsg) existingMsg.remove();

        const msgEl = document.createElement('div');
        msgEl.className = `comment-message ${type}`;
        msgEl.textContent = message;

        const commentsSection = document.querySelector('.comments-section');
        if (commentsSection) {
            commentsSection.insertBefore(msgEl, commentsSection.firstChild);
        } else {
            document.body.appendChild(msgEl);
        }

        setTimeout(() => {
            msgEl.classList.add('show');
        }, 10);

        setTimeout(() => {
            msgEl.classList.remove('show');
            setTimeout(() => msgEl.remove(), 300);
        }, 3000);
    }

    // 格式化时间
    function formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 30) return `${days}天前`;

        return date.toLocaleDateString('zh-CN');
    }

    // HTML转义防止XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 页面加载后初始化
    window.addEventListener('load', () => {
        setTimeout(initFrameAnimation, 300);
    });

})();