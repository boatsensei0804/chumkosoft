# รูปแนบประกาศ LINE

แอดมินเปิด “ส่งประกาศ LINE” → เขียนประกาศใหม่ → เลือกกลุ่มผู้รับ → กรอกหัวข้อ/ข้อความ → แนบรูปหนึ่งรูป → ตรวจสอบผู้รับ ข้อความ และรูป → ยืนยันส่ง รองรับ JPEG, PNG, WebP ไม่เกิน 3 MB และ 20 ล้านพิกเซล รูปเคลื่อนไหวไม่รองรับ

เซิร์ฟเวอร์ตรวจไฟล์จริง ปรับการหมุน ลบ metadata และสร้าง JPEG ขนาดสูงสุด 2048px พร้อม preview 640px ข้อความ Flex และรูป image message ส่งอยู่ใน LINE request เดียวด้วย retry key เดิม ปุ่มลองส่งต่อใช้ข้อมูลและรูป snapshot เดิม ประกาศข้อความล้วนยังส่งได้ตามเดิม

Migration เพิ่ม imageId, imageKey, imagePreviewKey และ imageSha256 เป็น nullable ไม่แก้ประกาศเก่า ใช้ private bucket เดิมของ MinIO/RustFS ไม่ต้องเพิ่ม bucket policy หรือ secrets

LINE ต้องเปิดรูปผ่าน HTTPS โดยไม่ล็อกอิน จึงมี endpoint `/api/line/announcement-images/{uuid}` และ `?size=preview` รูปเข้าถึงได้ด้วย UUID ที่สุ่มและคาดเดาไม่ได้ของประกาศที่ยังไม่ถูกลบ ผู้มีลิงก์สามารถเปิดรูปได้ ไม่มี endpoint สำหรับไล่รายการรูป ไม่มีการเปิด bucket ทั้งใบ ลบประกาศแล้ว endpoint จะไม่คืนรูป แต่ไม่สามารถเรียกคืนรูป/ข้อความที่ LINE รับไปแล้ว

URL ส่ง LINE ใช้ https://chumkosoft.com จึงควรทดสอบการส่งจริงหลัง deploy บนโดเมนนี้ การทดสอบ dev ใช้ mock sender เพื่อไม่ให้ส่งถึงบัญชีจริง

ตรวจด้วย unit tests สำหรับรูปปลอม/ไฟล์เกินขนาด/แปลง WebP และลบ EXIF, อัปโหลดล้มเหลวไม่ส่ง, retry ใช้รูป/รหัสเดิม, ข้อความล้วน, ขอบเขต media endpoint และการส่งสอง message ใน request เดียว ตรวจ UI ด้วย component จริงและ stub server actions ใน local fixture ไม่มีการส่ง LINE จริงระหว่างพัฒนา
