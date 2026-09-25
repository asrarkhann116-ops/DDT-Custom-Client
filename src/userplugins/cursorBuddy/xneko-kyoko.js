/*
 * Xneko Kyoko - Custom variant for Kyoko sprites
 * Uses "animation" field from atlas instead of hardcoded indices
 */

/* eslint-disable */

export default function xnekoKyoko(options = {}) {
    const {
        speed = 10,
        fps = 24,
        image = "./xneko.png",
        atlas = null,
    } = options;

    if (!atlas || !atlas.poses) {
        console.error("[Xneko Kyoko] No atlas data provided!");
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

    // Group poses by animation type from atlas
    const idlePoses = poses.filter(p => p.animation === "Idle").map(p => p.index);
    const walkPoses = poses.filter(p => p.animation === "Walk").map(p => p.index);

    console.log("[Xneko Kyoko] Idle poses:", idlePoses);
    console.log("[Xneko Kyoko] Walk poses:", walkPoses);

    let currentState = "idle";

    function init() {
        nekoEl.id = "xneko";
        nekoEl.ariaHidden = true;
        
        const firstPose = poses[0];
        nekoEl.style.width = `${firstPose.width}px`;
        nekoEl.style.height = `${firstPose.height}px`;
        
        nekoEl.style.position = "fixed";
        nekoEl.style.pointerEvents = "none";
        nekoEl.style.imageRendering = "auto";
        nekoEl.style.left = `${nekoPosX}px`;
        nekoEl.style.top = `${nekoPosY}px`;
        nekoEl.style.zIndex = 2147483647;
        
        nekoEl.style.backgroundImage = `url(${image})`;
        nekoEl.style.backgroundRepeat = "no-repeat";
        
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
        
        nekoEl.style.width = `${pose.width}px`;
        nekoEl.style.height = `${pose.height}px`;
        
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
            frameCount = 0;
        }
    }

    function idle() {
        idleTime += 1;
        setState("idle");
        
        if (idlePoses.length > 0) {
            const poseIndex = idlePoses[Math.floor(frameCount / 4) % idlePoses.length];
            updatePose(poseIndex);
        }
    }

    function frame() {
        frameCount += 1;
        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (distance < nekoSpeed || distance < 48) {
            idle();
            return;
        }

        idleTime = 0;
        setState("walk");

        if (walkPoses.length > 0) {
            const poseIndex = walkPoses[Math.floor(frameCount / 3) % walkPoses.length];
            updatePose(poseIndex);
        }

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
