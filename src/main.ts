/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.info('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.info('Scripting API ready');
    console.info('Player tags: ',WA.player.tags)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    setUpCamera().catch(e => console.error(e));

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.info('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

// The whole map is laid out to fit a 1920x1080 window, so the camera stays on all of it
// instead of following the player. A few rooms zoom in while someone is inside them.
const ZOOM_ROOMS = ['jitsiMeetingRoom', 'tvArea'];
const ZOOM_PADDING = 32; // one tile of context around a zoomed room

async function setUpCamera() {
    const map = await WA.room.getTiledMap();
    const width = (map.width ?? 0) * (map.tilewidth ?? 32);
    const height = (map.height ?? 0) * (map.tileheight ?? 32);
    // WA.camera.set takes the point to centre on, not a corner
    const showWholeMap = () => WA.camera.set(width / 2, height / 2, width, height, true, true);

    const areas = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const layer of map.layers) {
        if (layer.type !== 'objectgroup') continue;
        for (const o of layer.objects) {
            if (ZOOM_ROOMS.includes(o.name)) areas.set(o.name, { x: o.x, y: o.y, width: o.width ?? 0, height: o.height ?? 0 });
        }
    }

    // Two zoom rooms touch, so stepping from one into the other can fire its enter before
    // the other's leave; only the room the camera is currently on may send it back out.
    let zoomedOn: string | undefined;
    for (const [name, a] of areas) {
        WA.room.area.onEnter(name).subscribe(() => {
            zoomedOn = name;
            WA.camera.set(a.x + a.width / 2, a.y + a.height / 2,
                a.width + 2 * ZOOM_PADDING, a.height + 2 * ZOOM_PADDING, true, true);
        });
        WA.room.area.onLeave(name).subscribe(() => {
            if (zoomedOn !== name) return;
            zoomedOn = undefined;
            showWholeMap();
        });
    }

    showWholeMap();
}

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

export {};
