/*
Macro to generate a custom mixed heritage item.
Macro only needs to be run once per world or when new ancestries are added to the world.
*/

const packs = game.packs.filter( p => p.metadata.type === "Item" && p.index.some((e) => e.type === "ancestry") );
const indexData = [];
for (const p of packs) {
    indexData.push(await p.getIndex({fields:["system.vision", "system.slug"]}));
}
const worldAncestries = game.items.filter(x => x.type === "ancestry").flatMap(d => [{slug: d.system.slug === "" || d.system.slug === null || d.system.slug === undefined ? game.pf2e.system.sluggify(d.name) : d.system.slug, vision: d.system.vision}]);
const ancestries = indexData.flatMap(v => v.contents).flatMap(d => [{slug: d.system.slug === "" || d.system.slug === null || d.system.slug === undefined ? game.pf2e.system.sluggify(d.name) : d.system.slug, vision: d.system.vision}]).concat(worldAncestries);
const lowLightVisionExclusions = ancestries.filter(v => v.vision === "normal").map(llve => { return `heritage:${llve.slug}`});
const itemData = {
    "img": "systems/pf2e/icons/spells/chromatic-image.webp",
    "name": "Custom Mixed Heritage",
    "system": {
        "ancestry": null,
        "description": {
            "value": "<p>You can work with your GM to create a mixed heritage for an ancestry other than elf or orc. A custom mixed-ancestry heritage is an uncommon heritage. Choose an ancestry to tie to the heritage. You gain any traits of that ancestry and a new trait for your combined ancestry, similar to how the @UUID[Compendium.pf2e.heritages.N36ZR4lh9eCazDaN]{Aiuvarin} heritage grants the \"elf\" and \"aiuvarin\" traits. You also gain low-light vision if the ancestry tied to the heritage has low-light vision or darkvision. The heritage lets you select ancestry feats for the chosen ancestry in addition to those from your base ancestry.</p>\n<p>Characters of mixed Elven and Orcish ancestries should use the @UUID[Compendium.pf2e.heritages.N36ZR4lh9eCazDaN]{Aiuvarin} and @UUID[Compendium.pf2e.deities.39z55kowQFOUH2v0]{Droskar} heritages.</p>"
        },
        "publication": {
            "license": "ORC",
            "remaster": true,
            "title": "Pathfinder Player Core"
        },
        "rules": [
            {
                "choices": {
                    "filter": [
                        "item:type:ancestry"
                    ],
                    "itemType": "ancestry",
                    "slugsAsValues": true
                },
                "flag": "heritage",
                "key": "ChoiceSet",
                "prompt": "Select an Ancestry",
                "rollOption": "heritage"
            },
            {
                "add": [
                    "{item|flags.pf2e.rulesSelections.heritage}"
                ],
                "key": "ActorTraits"
            },
            {
                "key": "ActiveEffectLike",
                "mode": "override",
                "path": "system.details.ancestry.versatile",
                "value": "{item|flags.pf2e.rulesSelections.heritage}"
            },
            {
                "key": "ActiveEffectLike",
                "mode": "add",
                "path": "system.details.ancestry.countsAs",
                "value": "{item|flags.pf2e.rulesSelections.heritage}"
            },
            {
                "key": "Sense",
                "predicate": [
                    {
                        "nor": lowLightVisionExclusions
                    }
                ],
                "selector": "low-light-vision"
            },
            {
                "key": "GrantItem",
                "predicate": [
                    "heritage:elf"
                ],
                "replaceSelf": true,
                "uuid": "Compendium.pf2e.heritages.Item.Aiuvarin"
            },
            {
                "key": "GrantItem",
                "predicate": [
                    "heritage:orc"
                ],
                "replaceSelf": true,
                "uuid": "Compendium.pf2e.heritages.Item.Dromaar"
            }
        ],
        "traits": {
            "rarity": "uncommon",
            "value": []
        }
    },
    "type": "heritage"
}

if (game.items.some(x => x.name === "Custom Mixed Heritage")) {
    const answer = await Dialog.confirm({
        title: "Update Custom Mixed Heritage",
        content: "Replace Custom Mixed Heritage item with an updated version?"
    });
    if (!answer || answer === null) return;
    const item = game.items.getName("Custom Mixed Heritage");
    await item.update(itemData);
    ui.notifications.info("Updated Custom Mixed Heritage item");
    ui.sidebar.activateTab("items");
    await item.sheet.render(true, {tab: 'description'});
}
else { 
    const item = await Item.create(itemData);
    ui.sidebar.activateTab("items");
    ui.notifications.info("Created Custom Mixed Heritage item");
    await item.sheet.render(true);
}