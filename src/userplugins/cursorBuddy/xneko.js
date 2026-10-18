/*
 * Xneko - Atlas-based sprite follower
 * For packed sprite atlases with variable-sized frames
 */

/* eslint-disable */

export default function xneko(options = {}) {
    const {
        speed = 10,
        fps = 24,
        image = "./xneko.png",
        atlas = null, // JSON atlas data with pose coordinates
    } = options;

    if (!atlas || !atlas.poses) {
        console.error("[Xneko] No atlas data provided!");
        return () => {};
    }

    const nekoEl = document.createElement("div");
    let nekoPosX = 32;
    let nekoPosY = 32;

    let mousePosX = 0;
    let mousePosY = 0;

    let frameCount = 0;
    let idleTime = 0;
    let currentPoseIndex = 0;

    const nekoSpeed = speed;
    const poses = atlas.poses;

    // Map animation states to pose indices (adjust based on visual inspection)
    const poseMap = {
        idle: [0],           // Standing
        alert: [10],         // Alert
        walk: [1, 2, 3, 4],  // Walking animation
        sit: [11, 12],       // Sitting
        lying: [5, 6],       // Lying down
    };

    let currentState = "idle";

    function init() {
        nekoEl.id = "xneko";
        nekoEl.ariaHidden = true;
        
        // Variable size based on current pose
        const firstPose = poses[0];
        nekoEl.style.width = `${firstPose.width}px`;
        nekoEl.style.height = `${firstPose.height}px`;
        
        nekoEl.style.position = "fixed";
        nekoEl.style.pointerEvents = "none";
        nekoEl.style.imageRendering = "auto"; // Smooth scaling for high-res sprites
        nekoEl.style.left = `${nekoPosX}px`;
        nekoEl.style.top = `${nekoPosY}px`;
        nekoEl.style.zIndex = 2147483647;
        
        // Set background image
        nekoEl.style.backgroundImage = `url(${image})`;
        nekoEl.style.backgroundRepeat = "no-repeat";
        
        // Set initial pose
        updatePose(0);

        document.body.appendChild(nekoEl);
        document.addEventListener("mousemove", handleMouseMove);

        window.requestAnimationFrame(onAnimationFrame);
    }

    function handleMouseMove(event) {
        mousePosX = event.clientX;
        mousePosY = event.clientY;
    }

    function destroy() {
        document.removeEventListener("mousemove", handleMouseMove);
        nekoEl.remove();
    }

    function updatePose(poseIndex) {
        if (poseIndex < 0 || poseIndex >= poses.length) return;
        
        const pose = poses[poseIndex];
        currentPoseIndex = poseIndex;
        
        // Update element size
        nekoEl.style.width = `${pose.width}px`;
        nekoEl.style.height = `${pose.height}px`;
        
        // Update background position to show this sprite
        nekoEl.style.backgroundPosition = `-${pose.x}px -${pose.y}px`;
        nekoEl.style.backgroundSize = `${atlas.width}px ${atlas.height}px`;
    }

    let lastFrameTimestamp;

    function onAnimationFrame(timestamp) {
        if (!nekoEl.isConnected) return;
        if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
        if (timestamp - lastFrameTimestamp > 1000 / fps) {
            lastFrameTimestamp = timestamp;
            frame();
        }
        window.requestAnimationFrame(onAnimationFrame);
    }

    function setState(state) {
        if (currentState !== state) {
            currentState = state;
            frameCount = 0; // Reset animation
        }
    }

    function idle() {
        idleTime += 1;
        setState("idle");
        
        // Occasional sitting/lying animation
        if (idleTime > 50 && Math.random() < 0.01) {
            setState(Math.random() < 0.5 ? "sit" : "lying");
        }
        
        const poses = poseMap[currentState] || poseMap.idle;
        const poseIndex = poses[Math.floor(frameCount / 4) % poses.length];
        updatePose(poseIndex);
    }

    function frame() {
        frameCount += 1;
        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        // Idle if close to cursor
        if (distance < nekoSpeed || distance < 48) {
            idle();
            return;
        }

        // Moving towards cursor
        idleTime = 0;
        setState("walk");

        // Animate walk cycle
        const walkPoses = poseMap.walk;
        const poseIndex = walkPoses[Math.floor(frameCount / 3) % walkPoses.length];
        updatePose(poseIndex);

        // Move towards cursor
        nekoPosX -= (diffX / distance) * nekoSpeed;
        nekoPosY -= (diffY / distance) * nekoSpeed;

        nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
        nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

        nekoEl.style.left = `${nekoPosX}px`;
        nekoEl.style.top = `${nekoPosY}px`;
    }

    init();

    return destroy;
}
