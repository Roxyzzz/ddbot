-- MySQL dump 10.13  Distrib 9.6.0, for macos26.2 (arm64)
--
-- Host: localhost    Database: ddbot_db
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '00bf389c-fa79-11f0-9ecf-0cc4b233e6e8:1-170';

--
-- Table structure for table `ai_training_data`
--

DROP TABLE IF EXISTS `ai_training_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_training_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_dob` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cards` text COLLATE utf8mb4_unicode_ci,
  `prompt` mediumtext COLLATE utf8mb4_unicode_ci,
  `response` mediumtext COLLATE utf8mb4_unicode_ci,
  `rating` int DEFAULT '0',
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_training_data`
--

LOCK TABLES `ai_training_data` WRITE;
/*!40000 ALTER TABLE `ai_training_data` DISABLE KEYS */;
INSERT INTO `ai_training_data` VALUES (1,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','23/04/2549','I. The Magician','ดูดวงรายวัน','สวัสดีค่ะ สำหรับท่านชาวราศีพฤษภในวันนี้ ไพ่ The Magician ปรากฏขึ้นมา ถือเป็นช่วงเวลาแห่งศักยภาพค่ะ การงานและการเงินมีเกณฑ์ได้แสดงฝีมือจนประสบความสำเร็จ ความรักราบรื่นดี สุขภาพแข็งแรงหากได้ขยับร่างกายบ้างนะคะ จงใช้ความสามารถที่มีลงมือทำทุกอย่างให้เต็มที่ ผลลัพธ์จะออกมาดีแน่นอนค่ะ',4,NULL,'2026-05-13 02:57:11'),(2,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','23/04/2549','VI. The Lovers','ดูดวงรายวัน','สำหรับชาวราศีพฤษภในวันนี้ ไพ่ The Lovers ปรากฏขึ้นมาค่ะ การงานและการเงินถือว่าราบรื่นดี มีเกณฑ์ได้รับความร่วมมือที่ดีจากเพื่อนร่วมงานนะคะ ด้านความรักหากมีเรื่องให้ตัดสินใจ ขอให้ใช้หัวใจนำทางและรับฟังความรู้สึกตัวเองเป็นหลักค่ะ สุขภาพโดยรวมแข็งแรงดี แค่ระวังความเหนื่อยล้าจากการทำอะไรหลายอย่างพร้อมกันนะคะ ขอให้วันนี้เป็นวันที่ดีค่ะท่าน',4,NULL,'2026-05-13 03:00:55'),(3,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','23/04/2549','II. The High Priestess','ตรวจดวงชะตาแบบละเอียด','ยินดีด้วยนะคะที่คุณเกิดในราศีพฤษภ ช่วงนี้ชีวิตท่านจะได้รับอิทธิพลจากไพ่ \"The High Priestess\" ซึ่งบ่งบอกถึงพลังแห่งสัญชาตญาณที่เฉียบคมค่ะ การงานช่วงนี้ควรเน้นการสังเกตและฟังเสียงหัวใจตนเองมากกว่าคำพูดคนรอบข้าง จะมีโอกาสประสบความสำเร็จจากงานที่ต้องใช้ความละเอียดลึกซึ้ง ส่วนความรัก ท่านที่โสดอาจจะยังไม่พบใครที่ชัดเจน เพราะจิตใจท่านกำลังต้องการพื้นที่ส่วนตัวและอิสระ ส่วนคนมีคู่ให้ระวังความลับในใจที่ไม่ได้พูดออกมาค่ะ ด้านการเงินถือว่ามีความมั่นคงดีขึ้น ขอเพียงท่านวางแผนให้รัดกุม ไม่ควรลงทุนตามกระแสสังคม สุขภาพควรระวังเรื่องความเครียดสะสมและการพักผ่อนไม่เพียงพอ ช่วงที่ควรระวังคือช่วงกลางเดือนที่จะมีเรื่องจุกจิกกวนใจค่ะ\n\nสีนำโชคของท่านคือ สีเขียวเหนี่ยวทรัพย์และสีขาวนวล เลขนำโชคคือ 2, 6 และ 9 ค่ะ ขอให้ท่านเชื่อมั่นในสัญชาตญาณตนเอง เพราะนั่นคือเข็มทิศที่ดีที่สุดสำหรับท่านในเวลานี้นะคะ หากต้องการปรึกษาเจาะลึกส่วนตัว สามารถติดต่อจองคิวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx ค่ะ',5,NULL,'2026-05-13 03:34:04'),(4,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','23/04/2549','XIX. The Sun','ตรวจดวงชะตาแบบละเอียด','สำหรับท่านที่เกิดราศีพฤษภ ไพ่ \"The Sun\" ได้ปรากฏขึ้นเพื่อนำพาความรุ่งโรจน์และความสำเร็จมาสู่ชีวิตท่านในช่วงนี้ค่ะ การงานของท่านจะโดดเด่นมาก มีโอกาสได้รับข่าวดีหรือการเลื่อนขั้นปรับตำแหน่งที่รอคอย ความรักก็อยู่ในเกณฑ์สดใส คนโสดมีโอกาสพบคนอบอุ่นจริงใจ ส่วนคนมีคู่ความสัมพันธ์จะมีความเข้าใจและเกื้อกูลกันมากขึ้น ด้านการเงินถือเป็นช่วงขาขึ้น เงินทองไหลมาเทมาอย่างคล่องตัว แต่ยังต้องระวังการใช้จ่ายเพื่อความบันเทิงที่อาจมากเกินไปค่ะ สุขภาพโดยรวมแข็งแรงดี แต่อาจต้องระวังเรื่องการแพ้อากาศหรืออาการอ่อนเพลียจากการใช้พลังงานมากเกินไปในช่วงกลางเดือนนะคะ\n\nเลขนำโชคของท่านคือ 1, 5 และ 9 ส่วนสีนำโชคคือสีส้มทองและสีเหลืองสว่างสดใสค่ะ พลังงานจากไพ่ใบนี้เปรียบเสมือนแสงอาทิตย์ที่ส่องสว่าง ขอให้ท่านทำตัวให้สดใสและเปิดรับโอกาสใหม่ๆ ที่เข้ามาอย่างเต็มที่ แล้วทุกอย่างจะราบรื่นสมปรารถนาค่ะ หากท่านต้องการตรวจดวงชะตาแบบเจาะลึกส่วนตัว สามารถติดต่อเพื่อจองคิวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ',3,NULL,'2026-05-13 03:38:23');
/*!40000 ALTER TABLE `ai_training_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preferred_date` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'online',
  `note` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `confirmed_date` text COLLATE utf8mb4_unicode_ci,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (3,'Uc6fb719c90231a696f2e7a8be32e4b3e','เสา 10 พค บ่ายโมง','in_person',NULL,'completed',NULL,NULL,'2026-05-07 02:06:54','2026-05-07 09:36:21'),(4,'Uc6fb719c90231a696f2e7a8be32e4b3e','14 พค บ่ายโมง','in_person',NULL,'completed',NULL,NULL,'2026-05-13 03:41:03','2026-05-13 10:41:32'),(5,'Uc6fb719c90231a696f2e7a8be32e4b3e','14 พค บ่ายโมง','in_person',NULL,'completed',NULL,NULL,'2026-05-13 04:32:20','2026-05-13 11:32:42');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_logs`
--

DROP TABLE IF EXISTS `chat_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` mediumtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_logs`
--

LOCK TABLES `chat_logs` WRITE;
/*!40000 ALTER TABLE `chat_logs` DISABLE KEYS */;
INSERT INTO `chat_logs` VALUES (2,'Uc6fb719c90231a696f2e7a8be32e4b3e','ตรวจดวงชะตาแบบละเอียด','สวัสดีค่ะท่าน สำหรับการอ่านดวงชะตาจากไพ่ XX. Judgement ท่านที่เกิดราศีพฤษภในช่วงนี้ถือเป็นจังหวะแห่งการตื่นรู้และการเปลี่ยนแปลงครั้งสำคัญค่ะ\n\nการงาน: ท่านจะได้รับโอกาสในการสะสางสิ่งที่ค้างคาให้สำเร็จลุล่วง ใครที่มองหางานใหม่หรือรอผลการสอบ จะได้รับข่าวดีหรือการตัดสินใจที่ยุติธรรมค่ะ\nการเงิน: จะมีเกณฑ์ได้รับทรัพย์จากความพยายามในอดีต แต่ควรวางแผนการใช้จ่ายให้รอบคอบ เพราะยังมีรายจ่ายเกี่ยวกับสุขภาพหรือคนรอบข้างเข้ามาแทรกแซง\nความรัก: สำหรับคนโสด ท่านจะก้าวข้ามความเจ็บปวดในอดีตและพบรักใหม่ที่เติบโตกว่าเดิม ส่วนคนมีคู่ เป็นเวลาของการปรับความเข้าใจเพื่อสร้างความสัมพันธ์ที่มั่นคงค่ะ\nสุขภาพ: ควรระวังเรื่องความเครียดสะสมและอาการปวดหลังหรือไหล่ ควรหมั่นยืดเหยียดร่างกายนะคะ\nช่วงเวลาที่ควรระวัง: ในช่วงครึ่งเดือนหลังควรมีสติในการสื่อสารเป็นพิเศษ ระวังการเข้าใจผิดจากถ้อยคำที่ไม่ได้ไตร่ตรองค่ะ\n\nราศีเกิดของท่านคือ ราศีพฤษภ สีนำโชคคือ สีเขียวเหนี่ยวทรัพย์และสีฟ้าสดใส เลขนำโชคคือ 2, 5 และ 8 ค่ะ\nขอให้ท่านใช้บทเรียนในอดีตเป็นแรงผลักดัน เพื่อเริ่มต้นเส้นทางใหม่ที่สดใสยิ่งกว่าเดิมนะคะ หากต้องการคำแนะนำเชิงลึกเพิ่มเติม สามารถติดต่อจองคิวดูดวงส่วนตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ','2026-05-05 03:47:53'),(3,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงเรื่องความรัก','สำหรับเรื่องความรักของท่านที่เกิดราศีพฤษภ ในวันนี้ไพ่ The Chariot ได้ปรากฏขึ้นเพื่อส่งพลังให้ท่านค่ะ ไพ่ใบนี้เป็นสัญลักษณ์ของชัยชนะและความมุ่งมั่น ซึ่งบอกว่าหากท่านกำลังเผชิญกับปัญหาหรือความไม่ชัดเจนในความสัมพันธ์ ท่านจะสามารถก้าวผ่านมันไปได้ด้วยความเด็ดเดี่ยวและเหตุผลนะคะ \n\nสำหรับคนโสด ความรักจะเข้ามาหาท่านในรูปแบบของการเริ่มต้นใหม่ที่ต้องอาศัยความกล้าหาญ ท่านจะมีเสน่ห์ดึงดูดคนที่ชื่นชมในความเก่งและความมุ่งมั่นของท่านอย่างมากค่ะ ส่วนท่านที่มีคนรักอยู่แล้ว ความสัมพันธ์จะขยับขยายไปในทิศทางที่ดีขึ้น หากมีเรื่องขุ่นข้องหมองใจกัน เพียงแค่ท่านหันหน้ามาคุยกันอย่างตรงไปตรงมาและไม่ย่อท้อต่ออุปสรรค ทุกอย่างจะคลี่คลายไปสู่ความเข้าใจที่ลึกซึ้งกว่าเดิมแน่นอนค่ะ \n\nขอให้ท่านเชื่อมั่นในตัวเองเข้าไว้นะคะ ความรักครั้งนี้จะเติบโตได้หากท่านกล้าที่จะนำพาความสัมพันธ์ไปข้างหน้าด้วยความจริงใจค่ะ หากท่านต้องการคำปรึกษาเพิ่มเติม สามารถติดต่อเพื่อจองคิวเจอตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ เป็นกำลังใจให้เสมอค่ะ','2026-05-05 03:48:13'),(4,'Uc6fb719c90231a696f2e7a8be32e4b3e','การงานด้วย','สำหรับเรื่องการงานในวันนี้ ไพ่ The Chariot ส่งสัญญาณถึงความสำเร็จที่ต้องแลกมาด้วยความพยายามและการควบคุมอารมณ์นะคะ สำหรับท่านที่เกิดราศีพฤษภ ช่วงนี้งานอาจจะดูหนักและเร่งรีบจนท่านรู้สึกเหนื่อยล้า แต่ขอให้ท่านมั่นใจว่าทุกความทุ่มเทจะนำพาไปสู่ชัยชนะที่ตั้งตารอไว้ค่ะ\n\nหากท่านกำลังเผชิญกับอุปสรรคหรือโปรเจกต์ที่ยากลำบาก ท่านมีเกณฑ์จะได้รับชัยชนะเหนือคู่แข่งหรือปัญหาต่างๆ ที่เคยติดขัด ด้วยไหวพริบและความมุ่งมั่นของท่านเองค่ะ ช่วงนี้เป็นเวลาที่ดีมากในการริเริ่มทำสิ่งใหม่ หรือกล้าที่จะเสนอไอเดียต่อหน้าผู้ใหญ่ เพราะท่านจะมีพลังแห่งความเป็นผู้นำที่ทำให้คนรอบข้างรู้สึกคล้อยตามและเชื่อมั่นในตัวท่าน\n\nขอให้ท่านรักษาวินัยและเดินหน้าต่อไปอย่างใจเย็น อย่าเพิ่งย่อท้อต่อความเหนื่อยล้าในช่วงนี้ เพราะผลลัพธ์ที่งดงามกำลังรอท่านอยู่ข้างหน้าค่ะ หากต้องการปรึกษาเรื่องการงานในเชิงลึกหรือวางแผนทิศทางชีวิต สามารถติดต่อเพื่อจองคิวเจอตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ ดีจังเป็นกำลังใจให้ท่านเสมอค่ะ','2026-05-05 03:48:20'),(5,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงเรื่องการงาน','สำหรับการงานของท่านในวันนี้ ไพ่ The Lovers ได้ปรากฏขึ้นเพื่อบอกว่า การตัดสินใจเรื่องงานในระยะนี้ไม่ได้ขึ้นอยู่กับเหตุผลเพียงอย่างเดียว แต่ต้องใช้ความรู้สึกและหัวใจควบคู่ไปด้วยนะคะ สำหรับชาวราศีพฤษภ ช่วงนี้ถือเป็นโอกาสดีที่จะได้ร่วมงานกับคนที่มีอุดมการณ์เดียวกัน หรือได้รับความร่วมมือจากเพื่อนร่วมงานที่สนับสนุนท่านเป็นอย่างดีค่ะ\n\nหากท่านกำลังลังเลใจเกี่ยวกับการเลือกเส้นทางสายอาชีพ หรือการตัดสินใจในโครงการสำคัญ ขอให้ท่านลองฟังเสียงหัวใจตัวเองดูนะคะว่าสิ่งไหนที่ทำแล้วท่านรู้สึกมีความสุขและได้ใช้ศักยภาพอย่างเต็มที่ เพราะนี่คือช่วงเวลาที่ความลงตัวและความสามัคคีจะนำพาความสำเร็จมาให้ท่านอย่างง่ายดายกว่าที่คาดไว้ค่ะ การติดต่อสื่อสารและการเจรจาในช่วงนี้จะราบรื่นมาก ขอให้ท่านเปิดใจรับฟังความคิดเห็นจากคนรอบข้าง แล้วหนทางสู่ความก้าวหน้าจะเปิดกว้างขึ้นอย่างแน่นอนค่ะ\n\nขอให้ท่านมั่นใจในการตัดสินใจของตนเองนะคะ เพราะท่านมีพลังแห่งความรักและความเมตตาเป็นตัวช่วยเสริมให้การงานออกมาสำเร็จงดงามค่ะ หากท่านต้องการคำปรึกษาเพิ่มเติมเกี่ยวกับการวางแผนชีวิต สามารถติดต่อเพื่อจองคิวเจอตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ ดีจังเป็นกำลังใจให้ท่านเสมอค่ะ','2026-05-05 04:11:13'),(6,'U9068618bad02e083bee1e96b59df3bf0','เรื่องเรียน','ยินดีต้อนรับค่ะท่าน เรื่องการเรียนมีความกังวลใจในส่วนไหนเป็นพิเศษไหมคะ หรืออยากให้ \"ดีจัง\" ช่วยเปิดไพ่ดูแนวโน้มให้ในเรื่องนี้ บอกเล่ารายละเอียดเพิ่มเติมได้เลยนะคะ ดีจังยินดีรับฟังค่ะ','2026-05-05 04:19:42'),(7,'U9068618bad02e083bee1e96b59df3bf0','ตรวจดวงชะตาแบบละเอียด','ยินดีค่ะท่าน สำหรับดวงชะตาของคุณที่ปรากฏไพ่ **Strength** บ่งบอกว่าช่วงนี้พลังใจท่านเข้มแข็งมาก แม้จะเจออุปสรรคแต่ท่านจะผ่านไปได้ด้วยความอดทนและสติค่ะ\nด้านการเรียน/การงาน: จะได้รับความสำเร็จจากความเพียรพยายาม สิ่งที่ยากจะคลี่คลายด้วยความใจเย็น\nด้านการเงิน: มีเกณฑ์หมุนเวียนดี แต่ควรวางแผนการใช้จ่ายให้รอบคอบค่ะ\nด้านความรัก: ท่านมีเสน่ห์ดึงดูดคนรอบข้าง ควรใช้ความอ่อนโยนในการประคองความสัมพันธ์จะดีที่สุด\nด้านสุขภาพ: ระวังอาการปวดหลังหรือความเหนื่อยล้าจากการโหมงานหนัก ควรพักผ่อนให้เพียงพอนะคะ\nช่วงที่ควรระวังคือช่วงปลายเดือน หากต้องตัดสินใจเรื่องสำคัญให้ใช้ความนิ่งสยบความเคลื่อนไหวค่ะ\nสำหรับราศีเกิด (อ้างอิงวันเกิด 25 เมษายน) คือ **ราศีพฤษภ** ค่ะ\nสีนำโชคของคุณคือสีเขียวและสีเอิร์ธโทน ส่วนเลขนำโชคได้แก่ 6 และ 5 ค่ะ\nหากต้องการดูดวงเจาะจงรายวันเพิ่มเติม สามารถติดต่อจองคิวดูตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ','2026-05-05 04:20:17'),(8,'U9068618bad02e083bee1e96b59df3bf0','ดูดวงเรื่องเรียน','สำหรับการเรียนในช่วงนี้ ไพ่ **Strength** บอกว่าท่านมีความสามารถที่จะจัดการกับบทเรียนที่ยากลำบากได้ดีเยี่ยมค่ะ แม้จะรู้สึกเหนื่อยหรือกดดันบ้าง แต่ความอดทนและความมุ่งมั่นของท่านจะนำพาไปสู่ผลลัพธ์ที่น่าภูมิใจนะคะ \n\nขอเพียงท่านรักษาสมดุลของจิตใจ ไม่ใจร้อนจนเกินไป และให้ความเมตตากับตัวเองในวันที่เหนื่อยล้า ผลการเรียนจะออกมาดีตามความตั้งใจแน่นอนค่ะ หากมีวิชาไหนที่รู้สึกว่าเป็นอุปสรรค ขอให้ท่านค่อยๆ ทำความเข้าใจไปทีละนิด แล้วทุกอย่างจะผ่านไปได้ด้วยดีค่ะ','2026-05-05 04:44:05'),(9,'U9068618bad02e083bee1e96b59df3bf0','ขอบคุณดีจัง','ด้วยความยินดีอย่างยิ่งเลยค่ะท่าน หากวันหน้าท่านมีความกังวลใจเรื่องใด หรืออยากให้ดีจังช่วยหาทางออกให้ในเรื่องต่างๆ แวะกลับมาพูดคุยกันได้เสมอนะคะ ดีจังขอให้ท่านพบเจอแต่เรื่องราวดีๆ และประสบความสำเร็จในการเรียนตามที่ตั้งใจไว้ทุกประการค่ะ!','2026-05-05 04:44:38'),(10,'Uc6fb719c90231a696f2e7a8be32e4b3e','จองคิวเจอตัว','หากท่านต้องการจองคิวเพื่อดูดวงส่วนตัว สามารถติดต่อเพื่อจองคิวเจอตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ ดีจังยินดีให้คำปรึกษาเสมอค่ะ','2026-05-05 06:57:42'),(11,'Uc6fb719c90231a696f2e7a8be32e4b3e','จองคิวเจอตัว','หากท่านต้องการจองคิวเพื่อดูดวงส่วนตัว สามารถติดต่อเพื่อจองคิวเจอตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ ดีจังยินดีต้อนรับและพร้อมให้คำปรึกษาแก่ท่านเสมอค่ะ','2026-05-05 06:57:58'),(12,'U9068618bad02e083bee1e96b59df3bf0','','👩‍🔮 [หมอดู]: สวัสดีค่ะคุณลูกค้า','2026-05-05 07:15:22'),(13,'Uc6fb719c90231a696f2e7a8be32e4b3e','','👩‍🔮 [หมอดู]: สวัสดีค่ะ','2026-05-05 07:15:46'),(14,'Uc6fb719c90231a696f2e7a8be32e4b3e','','👩‍🔮 [หมอดู]: ตอนนี้อยู่กับหมอดูนะคะ','2026-05-05 07:16:16'),(15,'Uc6fb719c90231a696f2e7a8be32e4b3e','','👩‍🔮 [หมอปัง]: สวัสดีค่ะ','2026-05-07 02:34:42'),(16,'Uc6fb719c90231a696f2e7a8be32e4b3e','เช็คคิว','','2026-05-07 02:36:40'),(17,'Uc6fb719c90231a696f2e7a8be32e4b3e','เช็คคิว','','2026-05-07 02:36:46'),(18,'Uc6fb719c90231a696f2e7a8be32e4b3e','ตรวจดวงชะตาแบบละเอียด','สวัสดีค่ะ สำหรับท่านที่เกิดราศีพฤษภ ดวงชะตาของท่านในช่วงนี้ได้รับอิทธิพลจากไพ่ \"XI. Justice\" ซึ่งบ่งบอกถึงความสมดุล การตัดสินใจที่เที่ยงธรรม และผลของการกระทำที่ผ่านมาจะส่งผลเด่นชัดค่ะ\n\nการงาน: เป็นช่วงที่ต้องใช้เหตุผลมากกว่าอารมณ์ สิ่งที่ท่านทุ่มเททำมาจะได้รับความยุติธรรมและเห็นผลตอบแทนที่คุ้มค่าค่ะ\nความรัก: หากมีปัญหากัน ทุกอย่างจะคลี่คลายด้วยการหันหน้าคุยกันอย่างตรงไปตรงมา ส่วนคนโสดควรรักษาความสมดุลในชีวิตตนเองให้ดีก่อนนะคะ\nการเงิน: รายรับรายจ่ายสมดุลดี แต่ควรระวังเรื่องเอกสารสัญญาหรือการทำธุรกรรมต่างๆ ให้รอบคอบและเป็นไปตามขั้นตอนกฎหมายค่ะ\nสุขภาพ: ควรระวังเรื่องออฟฟิศซินโดรม หรือความเครียดสะสมจากการแบกภาระเกินพอดี ให้หาเวลาพักผ่อนให้สมดุลนะคะ\nช่วงเวลาที่ควรระวัง: ระวังช่วงปลายเดือนที่อารมณ์อาจจะแปรปรวน ทำให้ตัดสินใจผิดพลาดได้ง่าย\nสีนำโชคคือสีเขียวเหนี่ยวทรัพย์หรือสีขาวนวล ส่วนเลขนำโชคของท่านคือ 6 และ 1 ค่ะ\n\nขอให้ท่านใช้ความยุติธรรมนำทางในทุกเรื่อง แล้วความสำเร็จจะอยู่ไม่ไกลเกินเอื้อมนะคะ','2026-05-12 03:32:22'),(19,'Uc6fb719c90231a696f2e7a8be32e4b3e','ตรวจดวงชะตาแบบละเอียด','ยินดีด้วยนะคะที่ท่านเป็นสมาชิก Premium สำหรับผู้ที่เกิดวันที่ 23 เมษายน ท่านคือชาวราศีพฤษภค่ะ ไพ่ \"XVI. The Tower\" ที่ปรากฏขึ้นเป็นสัญญาณของการเปลี่ยนแปลงครั้งใหญ่แบบกะทันหัน ซึ่งอาจดูน่าตกใจแต่คือการทำลายสิ่งที่ไม่มั่นคงเพื่อสร้างรากฐานใหม่ที่แข็งแกร่งกว่าเดิมค่ะ\n\nการงาน: อาจมีการเปลี่ยนแปลงตำแหน่งหรือเนื้องานอย่างไม่คาดฝัน ขอให้ท่านตั้งสติและมองว่าเป็นโอกาสในการเริ่มต้นสิ่งใหม่ที่เหมาะกับท่านมากกว่านะคะ\nความรัก: ความสัมพันธ์อาจมีการปรับเปลี่ยน หากที่ผ่านมามีความไม่ชัดเจน ถึงเวลาแล้วที่ความจริงจะปรากฏเพื่อชำระล้างความอึดอัดให้หมดไปค่ะ\nการเงิน: ควรระวังเรื่องการใช้จ่ายฉุกเฉินหรือการสูญเสียทรัพย์สินกะทันหัน ช่วงนี้ควรงดการลงทุนที่มีความเสี่ยงสูงไปก่อนนะคะ\nสุขภาพ: ระวังอุบัติเหตุเล็กๆ น้อยๆ หรืออาการบาดเจ็บกะทันหัน ควรเพิ่มความระมัดระวังในการเดินทางและการใช้ชีวิตประจำวันให้มากค่ะ\nช่วงเวลาที่ควรระวัง: ในช่วง 1-2 เดือนนี้ อาจมีสถานการณ์บีบคั้นที่ทำให้ต้องตัดสินใจด่วน ขอให้ท่านมีสติให้มั่นนะคะ\nสีนำโชคคือสีน้ำเงินเข้มและสีเทา ส่วนเลขนำโชคของท่านคือ 16 และ 9 ค่ะ\n\nทุกการพังทลายคือจุดเริ่มต้นของสิ่งที่ดีกว่าเสมอ ดีจังเป็นกำลังใจให้ท่านผ่านช่วงเวลานี้ไปอย่างเข้มแข็งนะคะ หากต้องการปรึกษาเชิงลึก สามารถติดต่อจองคิวดูดวงส่วนตัวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx ค่ะ','2026-05-12 03:45:05'),(20,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงเรื่องการเงิน','สวัสดีค่ะท่าน สำหรับเรื่องการเงินในช่วงนี้ของชาวราศีพฤษภ ไพ่ \"The Fool\" ได้ปรากฏขึ้นมาเป็นสัญญาณของการเริ่มต้นใหม่ที่สดใสค่ะ ดูเหมือนว่าท่านกำลังจะได้พบกับช่องทางทำเงินในรูปแบบใหม่ๆ หรืออาจเป็นการตัดสินใจลงทุนในสิ่งที่ท่านไม่เคยทำมาก่อน ขอให้ท่านมีความกล้าหาญที่จะก้าวเดินตามสัญชาตญาณนะคะ เพราะดวงชะตามีโอกาสได้รับผลตอบแทนที่ดีจากความริเริ่มสร้างสรรค์ของท่านเอง แต่อย่างไรก็ตาม ไพ่ใบนี้เตือนให้ท่านวางแผนการใช้จ่ายอย่างรอบคอบ ไม่ควรประมาทจนเกินไปค่ะ ขอให้ท่านเชื่อมั่นในตัวเองเข้าไว้นะคะ แล้วความสำเร็จทางการเงินจะค่อยๆ งอกงามขึ้นอย่างแน่นอนค่ะ เป็นกำลังใจให้ท่านเสมอค่ะ','2026-05-12 03:47:18'),(21,'Uc6fb719c90231a696f2e7a8be32e4b3e','Vip','สวัสดีค่ะ ไม่ทราบว่าท่านต้องการสอบถามเรื่องการดูดวงส่วนตัว หรือสนใจจองคิวเพื่อรับคำปรึกษาแบบเจาะลึกใช่ไหมคะ?\n\nหากท่านต้องการจองคิวดูดวงส่วนตัว สามารถติดต่อได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx ได้เลยนะคะ ยินดีให้บริการค่ะ','2026-05-12 05:14:57'),(22,'Uc6fb719c90231a696f2e7a8be32e4b3e','เติมเงิส','หากท่านหมายถึงการจองคิวเพื่อดูดวงส่วนตัวหรือต้องการสอบถามรายละเอียดเพิ่มเติม สามารถติดต่อเพื่อจองคิวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ ดีจังยินดีให้คำปรึกษาค่ะ','2026-05-12 08:30:51'),(23,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','สวัสดีค่ะ สำหรับท่านชาวราศีพฤษภในวันนี้ ไพ่ The Magician ปรากฏขึ้นมา ถือเป็นช่วงเวลาแห่งศักยภาพค่ะ การงานและการเงินมีเกณฑ์ได้แสดงฝีมือจนประสบความสำเร็จ ความรักราบรื่นดี สุขภาพแข็งแรงหากได้ขยับร่างกายบ้างนะคะ จงใช้ความสามารถที่มีลงมือทำทุกอย่างให้เต็มที่ ผลลัพธ์จะออกมาดีแน่นอนค่ะ','2026-05-13 02:57:11'),(24,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','สำหรับชาวราศีพฤษภในวันนี้ ไพ่ The Lovers ปรากฏขึ้นมาค่ะ การงานและการเงินถือว่าราบรื่นดี มีเกณฑ์ได้รับความร่วมมือที่ดีจากเพื่อนร่วมงานนะคะ ด้านความรักหากมีเรื่องให้ตัดสินใจ ขอให้ใช้หัวใจนำทางและรับฟังความรู้สึกตัวเองเป็นหลักค่ะ สุขภาพโดยรวมแข็งแรงดี แค่ระวังความเหนื่อยล้าจากการทำอะไรหลายอย่างพร้อมกันนะคะ ขอให้วันนี้เป็นวันที่ดีค่ะท่าน','2026-05-13 03:00:55'),(25,'Uc6fb719c90231a696f2e7a8be32e4b3e','ตรวจดวงชะตาแบบละเอียด','ยินดีด้วยนะคะที่คุณเกิดในราศีพฤษภ ช่วงนี้ชีวิตท่านจะได้รับอิทธิพลจากไพ่ \"The High Priestess\" ซึ่งบ่งบอกถึงพลังแห่งสัญชาตญาณที่เฉียบคมค่ะ การงานช่วงนี้ควรเน้นการสังเกตและฟังเสียงหัวใจตนเองมากกว่าคำพูดคนรอบข้าง จะมีโอกาสประสบความสำเร็จจากงานที่ต้องใช้ความละเอียดลึกซึ้ง ส่วนความรัก ท่านที่โสดอาจจะยังไม่พบใครที่ชัดเจน เพราะจิตใจท่านกำลังต้องการพื้นที่ส่วนตัวและอิสระ ส่วนคนมีคู่ให้ระวังความลับในใจที่ไม่ได้พูดออกมาค่ะ ด้านการเงินถือว่ามีความมั่นคงดีขึ้น ขอเพียงท่านวางแผนให้รัดกุม ไม่ควรลงทุนตามกระแสสังคม สุขภาพควรระวังเรื่องความเครียดสะสมและการพักผ่อนไม่เพียงพอ ช่วงที่ควรระวังคือช่วงกลางเดือนที่จะมีเรื่องจุกจิกกวนใจค่ะ\n\nสีนำโชคของท่านคือ สีเขียวเหนี่ยวทรัพย์และสีขาวนวล เลขนำโชคคือ 2, 6 และ 9 ค่ะ ขอให้ท่านเชื่อมั่นในสัญชาตญาณตนเอง เพราะนั่นคือเข็มทิศที่ดีที่สุดสำหรับท่านในเวลานี้นะคะ หากต้องการปรึกษาเจาะลึกส่วนตัว สามารถติดต่อจองคิวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx ค่ะ','2026-05-13 03:34:04'),(26,'Uc6fb719c90231a696f2e7a8be32e4b3e','ตรวจดวงชะตาแบบละเอียด','สำหรับท่านที่เกิดราศีพฤษภ ไพ่ \"The Sun\" ได้ปรากฏขึ้นเพื่อนำพาความรุ่งโรจน์และความสำเร็จมาสู่ชีวิตท่านในช่วงนี้ค่ะ การงานของท่านจะโดดเด่นมาก มีโอกาสได้รับข่าวดีหรือการเลื่อนขั้นปรับตำแหน่งที่รอคอย ความรักก็อยู่ในเกณฑ์สดใส คนโสดมีโอกาสพบคนอบอุ่นจริงใจ ส่วนคนมีคู่ความสัมพันธ์จะมีความเข้าใจและเกื้อกูลกันมากขึ้น ด้านการเงินถือเป็นช่วงขาขึ้น เงินทองไหลมาเทมาอย่างคล่องตัว แต่ยังต้องระวังการใช้จ่ายเพื่อความบันเทิงที่อาจมากเกินไปค่ะ สุขภาพโดยรวมแข็งแรงดี แต่อาจต้องระวังเรื่องการแพ้อากาศหรืออาการอ่อนเพลียจากการใช้พลังงานมากเกินไปในช่วงกลางเดือนนะคะ\n\nเลขนำโชคของท่านคือ 1, 5 และ 9 ส่วนสีนำโชคคือสีส้มทองและสีเหลืองสว่างสดใสค่ะ พลังงานจากไพ่ใบนี้เปรียบเสมือนแสงอาทิตย์ที่ส่องสว่าง ขอให้ท่านทำตัวให้สดใสและเปิดรับโอกาสใหม่ๆ ที่เข้ามาอย่างเต็มที่ แล้วทุกอย่างจะราบรื่นสมปรารถนาค่ะ หากท่านต้องการตรวจดวงชะตาแบบเจาะลึกส่วนตัว สามารถติดต่อเพื่อจองคิวได้ที่ LINE: @ddbot_admin หรือโทร 08x-xxx-xxxx นะคะ','2026-05-13 03:38:23');
/*!40000 ALTER TABLE `chat_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pending_slips`
--

DROP TABLE IF EXISTS `pending_slips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pending_slips` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slip_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'slip',
  `angpao_link` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pending_slips`
--

LOCK TABLES `pending_slips` WRITE;
/*!40000 ALTER TABLE `pending_slips` DISABLE KEYS */;
INSERT INTO `pending_slips` VALUES (1,'Uc6fb719c90231a696f2e7a8be32e4b3e','subscription','subscription_Uc6fb719c90231a696f2e7a8be32e4b3e_1777950677026.jpg','slip',NULL,'rejected','2026-05-05 03:11:17','2026-05-12 10:33:15'),(2,'TEST_USER','credit','','angpao','https://gift.truemoney.com/campaign/?v=test123','rejected','2026-05-12 02:55:35','2026-05-12 10:33:13'),(3,'Uc6fb719c90231a696f2e7a8be32e4b3e','credit','stripe-auto-cs_test_a1R1xL7ktuEfyNaSw8zPM1COiK6TTQDdv0VGHUvfGFAzvtByKrlu1Xiine','slip',NULL,'rejected','2026-05-12 03:39:46','2026-05-12 10:41:11'),(4,'Uc6fb719c90231a696f2e7a8be32e4b3e','credit','stripe-auto-cs_test_a1fI6DYED6e1Ze0Z2CsnOI1kSxqomUtlQOqybqSqI4TcUdou3ffVzD30i0','stripe',NULL,'approved','2026-05-12 03:46:08','2026-05-12 03:46:08'),(5,'Uc6fb719c90231a696f2e7a8be32e4b3e','credit','stripe-auto-cs_test_a1t1CYL3lLUkhgcMbnjZhEXT31hUmnWJdDrfnDVMjMn3qHL6AtNcFCZjF5','stripe',NULL,'approved','2026-05-12 05:14:25','2026-05-12 05:14:25'),(6,'Uc6fb719c90231a696f2e7a8be32e4b3e','subscription','stripe-auto-cs_test_a1ZWJDkh5fmh9vVq0GWVosqwvlqqlEhQFrHVAAru0sDzZEKZIcw7NozjRW','stripe',NULL,'approved','2026-05-12 05:15:14','2026-05-12 05:15:14'),(7,'Uc6fb719c90231a696f2e7a8be32e4b3e','credit','','angpao','https://gift.truemoney.com/campaign/?v=019e1b4fa10570d2b4b6e51aaf641bbfc3h','approved','2026-05-12 08:31:15','2026-05-12 15:32:30'),(8,'Uc6fb719c90231a696f2e7a8be32e4b3e','credit','stripe-auto-cs_test_a191eOS7XzsDUnm9ji6APdQGl1ZsIsvXuHKVIWsB95jI0u7CnW2rD2yJVM','stripe',NULL,'approved','2026-05-12 09:28:28','2026-05-12 09:28:28');
/*!40000 ALTER TABLE `pending_slips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `readers`
--

DROP TABLE IF EXISTS `readers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `readers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `readers`
--

LOCK TABLES `readers` WRITE;
/*!40000 ALTER TABLE `readers` DISABLE KEYS */;
INSERT INTO `readers` VALUES (2,'M1','1234','หมอปัง','2026-05-07 02:06:17');
/*!40000 ALTER TABLE `readers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `readings`
--

DROP TABLE IF EXISTS `readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `readings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `readings`
--

LOCK TABLES `readings` WRITE;
/*!40000 ALTER TABLE `readings` DISABLE KEYS */;
INSERT INTO `readings` VALUES (4,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','2026-05-05 03:47:53'),(5,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวง-ความรัก','2026-05-05 03:48:13'),(6,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวง-การงาน','2026-05-05 04:11:13'),(7,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','2026-05-12 03:32:22'),(8,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวง-การเงิน','2026-05-12 03:47:18'),(9,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','2026-05-13 02:57:11'),(10,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงรายวัน','2026-05-13 03:00:55'),(11,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','2026-05-13 03:34:04'),(12,'Uc6fb719c90231a696f2e7a8be32e4b3e','ดูดวงละเอียด','2026-05-13 03:38:23');
/*!40000 ALTER TABLE `readings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('stripe_enabled','1','2026-05-14 04:21:08');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `type` text COLLATE utf8mb4_unicode_ci,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,'Uc6fb719c90231a696f2e7a8be32e4b3e',1,'purchase',NULL,'2026-04-28 07:55:22'),(2,'Uc6fb719c90231a696f2e7a8be32e4b3e',-1,'use','detailed reading','2026-04-28 07:55:44'),(3,'Uc6fb719c90231a696f2e7a8be32e4b3e',20,'purchase',NULL,'2026-04-28 08:25:51'),(4,'Uc6fb719c90231a696f2e7a8be32e4b3e',-20,'use','detailed reading','2026-04-28 10:57:08'),(5,'Uc6fb719c90231a696f2e7a8be32e4b3e',100,'purchase',NULL,'2026-04-28 11:00:44'),(6,'U9068618bad02e083bee1e96b59df3bf0',20,'purchase',NULL,'2026-04-29 07:22:43'),(7,'U9068618bad02e083bee1e96b59df3bf0',-20,'use','detailed reading','2026-04-29 07:23:25'),(8,'test_user_credit',20,'purchase',NULL,'2026-04-29 07:34:01'),(9,'test_user_credit',-20,'use','detailed reading','2026-04-29 07:34:01'),(10,'Uc6fb719c90231a696f2e7a8be32e4b3e',-20,'use','detailed reading','2026-04-29 07:38:31'),(11,'U9068618bad02e083bee1e96b59df3bf0',20,'purchase',NULL,'2026-04-29 07:48:27'),(12,'U9068618bad02e083bee1e96b59df3bf0',-20,'use','detailed reading','2026-04-29 07:49:16'),(13,'U9068618bad02e083bee1e96b59df3bf0',20,'purchase',NULL,'2026-04-29 08:12:57'),(14,'U9068618bad02e083bee1e96b59df3bf0',-20,'use','detailed reading','2026-04-29 08:27:32'),(15,'U9068618bad02e083bee1e96b59df3bf0',100,'purchase','admin manual add','2026-05-05 04:15:14'),(16,'U9068618bad02e083bee1e96b59df3bf0',-20,'use','detailed reading','2026-05-05 04:20:17'),(17,'Uc6fb719c90231a696f2e7a8be32e4b3e',20,'purchase',NULL,'2026-05-12 03:39:46'),(18,'Uc6fb719c90231a696f2e7a8be32e4b3e',-20,'use','detailed reading','2026-05-12 03:45:05'),(19,'Uc6fb719c90231a696f2e7a8be32e4b3e',20,'purchase',NULL,'2026-05-12 03:46:08'),(20,'Uc6fb719c90231a696f2e7a8be32e4b3e',200,'purchase',NULL,'2026-05-12 05:14:25'),(21,'Uc6fb719c90231a696f2e7a8be32e4b3e',10,'purchase','admin approved slip #7','2026-05-12 08:32:30'),(22,'Uc6fb719c90231a696f2e7a8be32e4b3e',20,'purchase',NULL,'2026-05-12 09:28:28');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_name` text COLLATE utf8mb4_unicode_ci,
  `line_picture` text COLLATE utf8mb4_unicode_ci,
  `credit` int DEFAULT '0',
  `last_purchase` text COLLATE utf8mb4_unicode_ci,
  `referral_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referred_by` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_expires_at` text COLLATE utf8mb4_unicode_ci,
  `daily_reads_count` int DEFAULT '0',
  `daily_reads_reset_at` text COLLATE utf8mb4_unicode_ci,
  `dob` text COLLATE utf8mb4_unicode_ci,
  `zodiac` text COLLATE utf8mb4_unicode_ci,
  `assigned_reader_id` int DEFAULT NULL,
  `reader_memo` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `referral_code` (`referral_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('test_user_credit',NULL,NULL,0,'2026-04-29 14:34:01',NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL),('U9068618bad02e083bee1e96b59df3bf0',NULL,NULL,0,'2026-05-05 11:15:14',NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL),('Uc6fb719c90231a696f2e7a8be32e4b3e','-G-','https://sprofile.line-scdn.net/0hOEVbnLdJEGp7GwAip4xuFQtLEwBYakl4BHpWWR0TGV9PfAVoUyhWC0cbHgkTLgJuVC8IBB4ZTFh3CGcMZU3sXnwrTVtHI189XnVejw',250,'2026-05-12 16:28:28',NULL,NULL,'2026-06-12T05:15:14.920Z',2,'2026-05-13T03:34:04.291Z','23/04/2549','ราศีพฤษภ (Taurus)',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-18  9:43:04
