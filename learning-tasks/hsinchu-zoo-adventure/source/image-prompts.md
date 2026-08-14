# 新竹動物園探險卡 v2 Imagegen 紀錄

本版使用 built-in imagegen。`animal-fight/card/images/*.png` 只作畫風 reference；所有產圖複製到本 repo 後使用，未修改 `animal-fight`。

## 共通畫風

```text
Grayscale realistic simplified wildlife field-guide illustration for a 5.5-year-old child's observation card. Match animal-fight's clean dark contour accents, moderate accurate texture, high printable grayscale contrast and pure white background. No text, labels, numbers, borders, watermarks or scenery.
```

## 老虎條紋三選

```text
One wide sheet with three equal panels. In every panel show only the identical shoulder-to-belly torso crop of a tiger-like body surface; no head, legs, feet or tail. Change only the pattern: (1) irregular curved and branching stripes extending from back toward belly, (2) regular equal-width parallel unbranched stripes, (3) short disconnected stripe segments. Same surface, perspective, lighting and contrast.
```

## 河馬眼耳高度三選

```text
One wide sheet with three identical side-view hippopotamus head outlines and identical nose, mouth and front-to-back feature order. Change only vertical eye/ear placement: (1) both eye and ear close to the top edge, (2) eye high but ear on the side, (3) both eye and ear on the side. No water or labels.
```

## 長臂猿雙線索三選

```text
One wide sheet with three identical headless three-quarter climbing primate torsos. Same body, legs, hands and pose. Change only arm length and tail: (1) arms about leg length, no tail; (2) arms much longer than legs, long tail; (3) arms much longer than legs, no tail. Keep limb endpoints clear and tail unobscured.
```

## 長鼻浣熊雙線索三選

```text
One wide sheet with three equal feature assemblies, only a cropped side muzzle on the left and a detached tail on the right, no complete face or body: (1) short muzzle plus long subtly ringed tail, (2) long slightly upturned muzzle plus long subtly ringed tail, (3) long slightly upturned muzzle plus short plain tail. Tail rings must be low-contrast blurred coati bands, not black-and-white lemur rings.
```

## 龜殼正上方三選

```text
One wide sheet with three complete carapaces viewed perfectly vertically from directly overhead; no head, legs, feet or tail. Same external visual size and lighting: (1) broad oval Aldabra giant tortoise type with smooth margin and central/peripheral scutes, (2) narrower elongated smooth water-turtle type with a different scute arrangement, (3) common snapping turtle type with slightly broader posterior, shallow realistic posterior serrations and only subtle low ruggedness—no giant spikes or three huge keels.
```

## 狐獴參考前腳

```text
Only one real meerkat forepaw plus a short forearm, close-up from an oblique three-quarter angle slightly above. Exactly four naturally fanned mutually visible toes and exactly four connected long narrow gently curved digging claws. No underside pads, face, body or ground.
```

## 狐獴前腳三選

```text
One wide sheet derived from the reference paw's exact angle, crop and lighting. Same-size forepaws: (1) exactly four toes with four long curved claws, (2) exactly four toes with four short blunt claws, (3) exactly five toes with five long curved claws. Long claws must appear in 1 and 3; four toes in 1 and 2, so both clues are necessary.
```

## 地圖圖示

```text
Gibbon: seated side profile on a branch; forearms, hands and rear area obscured by branch/leaves so arm length and tail absence are not answer clues.

Tiger + orangutan: equal head-and-shoulders portraits; crop before arms and torso. Tiger has only natural facial markings, no body stripe swatch; orangutan arm length is not visible.

Hippo: straight frontal broad muzzle and lower face only; crop out the entire eye-and-ear region.

Turtle + raccoon family: tucked turtle in strict side view with no overhead shell detail; generic raccoon-family head only with ordinary muzzle, no long coati nose or tail rings.
```

## 昆蟲題

沿用 v1 已人工核對的獨角仙、蜘蛛、蜈蚣插圖，不重新產圖。使用者最終覆核後，題幹改為「誰才是昆蟲？你是怎麼知道的？」；孩子先做分類並說一個理由，數腳只是一種可能的判斷線索。

## v3 替換：河馬腳

```text
Reference: one anatomically believable common hippopotamus foot and short lower leg from an oblique three-quarter angle slightly above. Exactly four separate short weight-bearing toes; each ends in an independent broad, blunt, rounded hoof-like nail. Realistic gray skin and field-guide detail; no footprint, sole, mud, body or scenery.

Choices: same foot, angle, size and lighting in three panels. (1) four toes with four thin long pointed claws; (2) four toes with four broad blunt rounded nails, correct; (3) three toes with three broad blunt rounded nails while keeping the same overall foot width. Four toes occur in 1/2; broad nails occur in 2/3.
```

## v3 替換：長臂猿手

```text
Reference: one anatomically believable Mueller's gibbon hand, relaxed and gently curved, oblique three-quarter view slightly above. Narrow elongated palm; exactly four very long slender curved fingers with flat nails; one shorter thumb whose base is low near the wrist; conspicuously deep thumb-index cleft. No branch, grip action, arm or body.

Choices: same wrist, palm outline, view and size. (1) four short straighter fingers + low thumb/deep cleft; (2) four long curved fingers + high human-like thumb base/shallow cleft; (3) four long curved fingers + low thumb/deep cleft, correct. Long fingers occur in 2/3; low thumb/deep cleft occurs in 1/3.
```

## v4 火車地圖：寫實普悠瑪

使用 built-in Imagegen，實車參考為 Wikimedia Commons 的 `TEMU2000 Series Puyuma Express EMU.jpg`；畫風參考既有灰階動物卡。生成時使用綠幕背景，再以 imagegen skill 的 `remove_chroma_key.py` 轉為透明 PNG。

```text
Create a highly detailed, realistic grayscale illustration of a Taiwan Railways TEMU2000 Puyuma Express. Preserve its true rounded aerodynamic nose, large dark curved windshield, paired upper headlights, paired lower lamp housings, smooth body and side livery hierarchy. Show the lead car plus part of the following train in a three-quarter front view from slightly above; the body recedes toward the upper right and the nose points toward the lower left. Match the existing animal cards: realistic proportions, finely modeled tonal shading, crisp dark contour, subtle hand-rendered texture and polished educational-card finish. Train only on a perfectly flat solid #00ff00 chroma-key background; no track, scenery, people, wires, text, logo, watermark or cast shadow. Avoid a generic bullet train, Shinkansen nose, toy train, flat vector icon or schematic geometry.
```

## v5 火車地圖：普悠瑪與鐵軌整合

使用 built-in Imagegen 的 precise-object edit，鎖定 v4 普悠瑪外觀，只新增共享透視的短鐵軌、枕木、少量碎石與輪軌接觸陰影；再經綠幕去背輸出透明 PNG。

```text
Preserve the existing grayscale TEMU2000 Puyuma Express exactly, and add a short realistic railway track directly beneath it so the bogies and wheels sit convincingly on the two steel rails. The track shares the train's exact three-quarter perspective, recedes toward the upper right with the train, and extends only a short distance beyond the rounded nose toward the lower left. Include two parallel steel rails, evenly spaced concrete sleepers, a very small amount of clean ballast and natural contact shadow beneath the undercarriage. Keep the train identity, nose, windows, paired lights, livery, cars, camera angle, proportions and tonal shading unchanged. Uniform #00ff00 chroma-key background; no scenery, platform, poles, wires, signs, text, logo or watermark. Avoid detached track, wrong perspective, a floating train or track crossing diagonally beneath the train.
```

歸檔時只保留最終透明 WebP 與完整 prompt，不把約 2 MB 的綠幕 source master 放進 Git；需要再生成時，以本節 prompt 與成品圖作 reference 即可。原始 source 曾存於 built-in Imagegen 的本機 generated-images cache，不視為 repo 正本。
