<p align="center">
  <img src="icon.svg" alt="SurvivalRP" height="256">
</p>
<h1>
  SurvivalRP
</h1>

Optional survival mechanics for World of Warcraft role-play: your character gets hungry, thirsty, tired, and feels the weather.

None of it affects real gameplay, but the addon is affected by real gameplay.

SurvivalRP never affects your health, movement, combat, stats, or any protected action. If your character starves, nothing happens mechanically - you simply look starving to other people running the addon.

![Build status](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## What it does

![Full Interface](full-interface.webp)

* **Hunger and thirst** drain slowly and recover when you eat or drink - real food and drink.
* **Fatigue** responds to what you are doing:
  * Running, swimming and fighting tire you faster;
  * Cities and inns slow it down;
  * Sitting or `/sleep` lets you recover - and you rest poorly while cold, hot, starving or parched.
* **Temperature** is modelled in real degrees (Celsius or Fahrenheit).
  * Every zone has its own climate, some with warmer or cooler subzones, and deserts swing hard between a scorching afternoon and a cold night.
  * Your body drifts toward what you are exposed to - and you can do something about it

These needs are tracked in a radial HUD:

![Normal Radial Needs HUD](needs-hud-normal.webp)
![Undead Radial Needs HUD](needs-hud-undead.webp)
![San'layn Radial Needs HUD](needs-hud-sanlayn.webp)
![Void Elf Radial Needs HUD](needs-hud-void.webp)
![San'layn Shadow Priest Radial Needs HUD](needs-hud-sanlayn-shadowpriest.webp)

You can see the detail when hovering over the bag:

![Hover Details](hover-details.webp)

| | |
| --- | --- |
| **Clothing** | Tag your transmog outfits as warm, light, armour or bare. What you wear changes how much the weather reaches you. (taking all armour off is the same as "bare") |
| **Wetness** | Swimming soaks your clothes. They take hours to dry - faster in the heat, faster still if you take them off. Armour never gets past damp, and dries twice as fast. |
| **Condition and grime** | Time spent fighting wears your gear down; a damp set of armour rusts even packed away. Time outdoors leaves it grimy - much less so in a city or an inn. Wash grime out with soap (never consumed); repair at any vendor mends condition (never grime). |
| **Fire and shelter** | Campfires warm you; buildings and inns shelter you. A fire in Dun Morogh is a great idea, but not quite so in Tanaris. |

You may tag your outfits right in the transmog window:

![Transmog tab](transmog-tab-survival-rp.webp)

Each outfit's wet / condition / grime is broken out in its own **Outfits** tab
in the character window - your own exact percentages, since that rule (never
quantified) only governs what you see of *other* people. Clothes that fall
apart from neglect stop insulating and read as bare, but are still described
as ragged rather than naked. Click an outfit's name to switch straight to it;
the list scrolls once you have more outfits saved than fit the window.

**Your race, class and forms matter.**

Each race has its own rates and comfortable temperature band.

Some race/classes may have different needs entirely:
- The undead (Forsaken & Death Knights) never thirst or tire and only feed by Cannibalize
- Earthen neither eat nor drink
- Forsaken slowly rot and preserve themselves with [Embalming Fluid](https://www.wowhead.com/item=63296/embalming-fluid)
- Blood, Night and Void Elves and Death Knights can opt into **San'layn physiology** (Character tab, off by default): hunger and thirst are replaced by a single Blood-thirst, fed by troll's blood elixirs, blood sausages, blood trinkets, Vampiric Embrace, Vampiric Blood or Cannibalize. San'layn are comfortable in the cold and suffer in the heat, and the living among them tire faster by day than by night.

Worgen, Dracthyr and Druid forms retune survival
and are tracked automatically.


### Tooltips
Other people running SurvivalRP can see how your character is doing:

> They look hungry.

> They are shivering.

![Tooltip (normal)](tooltip-normal.webp)

### Total RP 3 Tooltips

If TRP3 is installed, survival lines appear beneath its character tooltip (TRP3 hides Blizzard's, which would otherwise take our lines with it).

![Tooltip (TRP3)](tooltip-trp3.webp)


### DM control - run survival in your stories

If you are the **party leader, raid leader, or a raid assistant**, a **DM** tab appears in your character window.

![DM tab](tab-dm.webp)

From it you can, for one member or everyone:

- **Set** a value - make someone parched, freezing, or soaked instantly.
- **Rate ×** - dial a need's drain. E.g.:
  - `3` thrice as fast
  - `0.5` half as fast
  - `-2` twice as fast, in reverse.
- **Lock** a need so it stops changing at all
- **Weather** and **body temperature** - impose a preset.

DM authority is checked against the live in-game group roster and **every member can always opt out** in their own Character tab.

### Limitations
- `/sit`, sitting keybind and clicking on a chair is impossible to detect so there's a toggle so you can inform the addon that you're sitting
- Weather effects (rain/snow) can't be detected (though I'm seeing if I can hijack the Situations transmog events to do it... but it will require some setup)

## The character window

Left-click the HUD bag brings up a tabbed window.

**Character** - configure your pronoun (He / She / They) and per-character options.

![Character tab](tab-character.webp)

**Info** - see each need with how fast it is changing and how long until empty, plus the survival rules for your race, class and forms.

![Info tab](tab-info.webp)

**Tips** - general survival advice and tips specific to your kind.

![Tips tab](tab-tips.webp)

**Outfits** - every saved outfit (plus "Untransmogged gear", for what you are
wearing when no outfit is applied), each with its own wet / condition / grime,
the worn one highlighted. Click a name to switch straight to it, scrolling if
you have more outfits than fit the window, or wash a set clean from here if
you are carrying soap.

![Outfits tab](tab-outfits.webp)

## Addon settings

Control the HUD, units, which needs are tracked, how and if you get alerted, and what you share with others.

![Settings (1)](settings-part1.webp)
![Settings (2)](settings-part2.webp)

---

## Installing

1. Download the latest release
2. Extract into `World of Warcraft/_retail_/Interface/AddOns/`
3. `/reload` or restart

## Using it

A small radial HUD shows your four needs. Left-click the centre for the character window, right-click for options, hover for a quick summary, or drag it anywhere after `/survivalrp unlock`.

`/survivalrp help` lists everything. The ones you will actually use:

| Command | |
| --- | --- |
| `/survivalrp` | your current status |
| `/survivalrp who [name]` | see another player (or just target them) |
| `/survivalrp wear <tag>` | tag the outfit you are wearing (just tags, it doesn't change the transmog) |
| `/survivalrp rest` / `wake` | start or stop resting |
| `/survivalrp share on` / `off` | control what you share |

Tag your outfits in the **SurvivalRP tab** of the transmog window. If you use Blizzard's outfit Situations, your character dresses for the weather on its own - and the addon notices within a second.

Not detecting some food or drink? Run `/survivalrp debug auras` while consuming it and open an issue with the output; it is a one-line data fix.

## Privacy

Sharing is on by default and easy to narrow:

- **Share exact values** - turn it off and only broad labels leave your client.
  Your numbers are never transmitted, not merely hidden at the far end.
- **Sharing mode** - everyone, only players you have interacted with, or nobody.
- **Block list** - `/survivalrp block <name>`, or manage it in the options.

Everything received is validated and read-only. Nothing another player sends can change your values, and SurvivalRP never executes anything it receives.

The one exception - a DM adjusting your survival - is verified against the group roster and gated by your own opt-in, which you control.

**If you cannot reach someone:** sharing works over party, raid, instance and guild, plus direct whispers. WoW has a long-standing issue delivering addon whispers between some connected realms, so if a player on another realm never appears, grouping with them will work. The addon tells you when the game refuses a message rather than leaving you guessing.

**Version compatibility:** 1.1 bumped the sharing protocol to carry garment condition and grime, and 1.2 bumped it again to carry Blood-thirst. A partner on an older protocol version simply sees no survival data from you until both update - nothing breaks, but nothing is exchanged either.


## Reporting a problem

Run `/survivalrp bugreport`, copy the window, and open an issue with it. It
includes your version, settings, state and any recorded errors - everything
needed to diagnose the problem without a back-and-forth.

## Translating

SurvivalRP follows your WoW client's language and ships translations for every
locale the client supports (machine-generated for now - native polish is very
welcome). To help, copy `src/Locales/enUS.lua` to your locale and translate the
values; missing keys fall back to English, so even a partial pass is useful. See
docs/TRANSLATION.md.

## Contributing

See CONTRIBUTING.md for the layout, tests and conventions.

## Thanks

Players whose feedback has shaped SurvivalRP:

* ForteofSable

## License

Apache 2.0 - see LICENSE. You may fork and modify freely, but the
NOTICE file crediting the original author and repository must be kept
in any derivative work.
