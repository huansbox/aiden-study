# 自然第四批：五堵原卷的有限轉題

#134 三個完整活動、五個原卷作答格已通過fresh reviewer獨立覆核，並由統籌核准建成revision 8本地題包；正式KV尚未發布，coverage仍為false。沒有新增收卷；六份已收題卷的總數不變。

來源是五堵國小113學年度四下期末自然，出版社由同校同年版本表確認為翰林。依地表與防災概念比對暫定核心，不能稱為四上第一次段考卷；桃子腳正式考試範圍仍未取得。來源查核見[跨出版社manifest](../../../learning-tasks/grade4-sem1-science-exam1/source/round2-cross-publisher-manifest.json)，完整候選定位見[第四批候選](fourth-batch-candidates.json)。原卷無已取得的校方答案；三題由作者與fresh reviewer各自獨立解題一致，核准狀態為`independently_solved_twice_no_official_answer`，不冒充校方答案。

| 原卷位置 | 預留practiceId | 方法缺口 | 作者處理 |
| --- | --- | --- | --- |
| PDF第1頁，二、選擇3 | S1-P14 | 有明示時點的地震防災行動辨識 | 完整四選一獨立覆核通過；未增加原題前提。 |
| PDF第1頁，二、選擇5 | S1-P15 | 保命動作順序辨識 | 完整四選一獨立覆核通過；未改選項順序。 |
| PDF第2頁左欄，三、綜合5 | S1-P16 | 流水搬運與堆積的原圖判讀 | 完整三格共用選項與圖像覆核通過；只作一般教學示意，不宣稱實測或控制變因。 |

第2頁右欄另有題號5的能源閱讀題，不是本輪流水來源。流水圖題最初由作者提出材料分類不足以支持無條件唯一結果的疑義；fresh reviewer獨立解題後，指出同一土堆流水情境可作一般搬運模型。統籌與作者重新區分一般示意和實測證明，接受前者，才加入完整候選。原始疑義和裁決過程留在private QA；沒有修改原圖增加粒徑、測量或實驗條件，也不拆題湊數。

防災兩題依消防署[全民地震應變呼籲](https://www.nfa.gov.tw/cht/index.php?article_id=16075&code=list&flag=detail&ids=21)及[一般室內地震應變](https://www.nfa.gov.tw/eng/index.php?article_id=8964&code=list&flag=detail&ids=1371)交叉查核。流水的一般概念參照臺中市政府教育局製作、國教院刊載的[〈流水力量〉](https://stv.naer.edu.tw/watch/298007)。這些官方資料不是校方答案，亦不證明桃子腳正式範圍；答案與完整素材只存private。

基線revision 7包含94題（數學57／自然37），125,022 bytes，距128KiB僅6,050 bytes。核准候選由production builder建為revision 8、97題（數學57／自然40）、130,248 bytes，剩824 bytes，SHA256 `ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29`；正式KV尚未發布。原圖裁為537×229且無縮放，二值化PNG為1,592 bytes，保留澆水、坡度、石粒與全部位置字標；fresh reviewer已從canonical頁圖獨立重算像素並目視覆核。

本輪不重開第三批blocked題，不重用已預留的S1-P13，不改舊94題、解說或mapping。三題補防災行動、動作順序與流水搬運示意三種練法；前提清楚的風力比較及地表控制變因實驗仍未補足。正式KV發布及讀回完成後才更新coverage；目前三項皆為false。
