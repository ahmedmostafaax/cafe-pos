import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Category from "./database/models/category.model.js";
import Menu from "./database/models/menu.model.js";
import User from "./database/models/user.model.js";
import Table from "./database/models/table.model.js";
import Settings from "./database/models/settings.model.js";
import Coupon from "./database/models/coupon.model.js";

const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

const categories = [
  { name: "مشويات", nameAr: "مشويات", nameEn: "Grills", sort: 1 },
  { name: "فطور", nameAr: "فطور", nameEn: "Breakfast", sort: 2 },
  { name: "ساندوتشات", nameAr: "ساندوتشات", nameEn: "Sandwiches", sort: 3 },
  { name: "مشروبات ساخنة", nameAr: "مشروبات ساخنة", nameEn: "Hot Drinks", sort: 4 },
  { name: "مشروبات باردة", nameAr: "مشروبات باردة", nameEn: "Cold Drinks", sort: 5 },
  { name: "حلويات", nameAr: "حلويات", nameEn: "Desserts", sort: 6 },
];

const menuItems = [
  // مشويات - kitchen
  { name: "كفتة مشوية", nameAr: "كفتة مشوية", nameEn: "Grilled Kofta", station: "kitchen", price: 85, descAr: "ربع كيلو كفتة على الفحم", sort: 1 },
  { name: "شيش طاووق", nameAr: "شيش طاووق", nameEn: "Shish Tawook", station: "kitchen", price: 95, descAr: "صدور فراخ متبلة مشوية", sort: 2 },
  { name: "ريش ضاني", nameAr: "ريش ضاني", nameEn: "Lamb Chops", station: "kitchen", price: 180, descAr: "ريش ضاني طازجة", sort: 3 },
  { name: "Mixed Grill", nameAr: "مشكل مشاوي", nameEn: "Mixed Grill", station: "kitchen", price: 220, descAr: "كفتة + شيش + كباب", sort: 4 },

  // فطور - kitchen
  { name: "فول بالزيت الحار", nameAr: "فول بالزيت الحار", nameEn: "Foul", station: "kitchen", price: 25, descAr: "فول مدمس مع زيت حار وطحينة", sort: 5 },
  { name: "طعمية", nameAr: "طعمية", nameEn: "Taameya", station: "kitchen", price: 20, descAr: "5 قطع طعمية مقرمشة", sort: 6 },
  { name: "بيض بالبسطرمة", nameAr: "بيض بالبسطرمة", nameEn: "Eggs with Basturma", station: "kitchen", price: 45, descAr: "بيض مقلي مع بسطرمة", sort: 7 },

  // ساندوتشات - kitchen
  { name: "شاورما فراخ", nameAr: "شاورما فراخ", nameEn: "Chicken Shawarma", station: "kitchen", price: 55, descAr: "شاورما فراخ بعيش سوري", sort: 8 },
  { name: "برجر لحم", nameAr: "برجر لحم", nameEn: "Beef Burger", station: "kitchen", price: 75, descAr: "برجر لحم أنجوس 150 جرام", sort: 9 },
  { name: "كرسبي تشيكن", nameAr: "كرسبي تشيكن", nameEn: "Crispy Chicken", station: "kitchen", price: 65, descAr: "قطع فراخ مقرمشة", sort: 10 },

  // مشروبات ساخنة - bar
  { name: "شاي", nameAr: "شاي", nameEn: "Tea", station: "bar", price: 15, descAr: "شاي أحمر ثقيل", sort: 11 },
  { name: "قهوة تركي", nameAr: "قهوة تركي", nameEn: "Turkish Coffee", station: "bar", price: 25, descAr: "قهوة تركي أصلي", sort: 12 },
  { name: "نسكافيه", nameAr: "نسكافيه", nameEn: "Nescafe", station: "bar", price: 30, descAr: "نسكافيه بالحليب", sort: 13 },
  { name: "هوت شوكليت", nameAr: "هوت شوكليت", nameEn: "Hot Chocolate", station: "bar", price: 35, descAr: "شوكولاتة ساخنة غنية", sort: 14 },

  // مشروبات باردة - bar
  { name: "عصير فراولة", nameAr: "عصير فراولة", nameEn: "Strawberry Juice", station: "bar", price: 40, descAr: "فراولة فريش", sort: 15 },
  { name: "ليمون نعناع", nameAr: "ليمون نعناع", nameEn: "Lemon Mint", station: "bar", price: 35, descAr: "ليمون فريش مع نعناع", sort: 16 },
  { name: "موهيتو", nameAr: "موهيتو", nameEn: "Mojito", station: "bar", price: 45, descAr: "موهيتو كلاسيك", sort: 17 },
  { name: "مياه معدنية", nameAr: "مياه معدنية", nameEn: "Water", station: "bar", price: 10, descAr: "مياه معدنية صغيرة", sort: 18 },

  // حلويات - kitchen
  { name: "أم علي", nameAr: "أم علي", nameEn: "Om Ali", station: "kitchen", price: 45, descAr: "أم علي بالمكسرات", sort: 19 },
  { name: "بسبوسة", nameAr: "بسبوسة", nameEn: "Basbousa", station: "kitchen", price: 30, descAr: "قطعة بسبوسة بالقشطة", sort: 20 },
];

async function seed() {
  await mongoose.connect(MONGO);
  console.log("Connected to MongoDB:", MONGO);

  // 1. Users
  console.log("Seeding users...");
  const usersToSeed = [
    { name: "Ahmed Mostafa (Admin)", username: "ahmed", password: "ahmed123", role: "admin" },
    { name: "كاشير الصالة", username: "cashier", password: "cashier123", role: "front" },
    { name: "شيف المطبخ", username: "kitchen", password: "kitchen123", role: "kitchen" },
    { name: "باريستا البار", username: "bar", password: "bar123", role: "bar" },
  ];

  for (const u of usersToSeed) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      await User.create(u);
      console.log(`✅ User created: ${u.username} (${u.role})`);
    } else {
      console.log(`ℹ️ User already exists: ${u.username}`);
    }
  }

  // 2. Tables
  console.log("Seeding tables...");
  for (let i = 1; i <= 10; i++) {
    const tableNo = String(i);
    const existing = await Table.findOne({ tableNo });
    if (!existing) {
      await Table.create({ tableNo, seats: i <= 4 ? 4 : 6, status: "available" });
    }
  }
  console.log("✅ 10 Tables ready");

  // 3. Categories & Menu
  console.log("Seeding categories and menu...");
  await Category.deleteMany({});
  await Menu.deleteMany({});

  const createdCats = await Category.insertMany(categories);
  console.log(`✅ ${createdCats.length} categories created`);

  const catMap = {};
  createdCats.forEach((c) => {
    catMap[c.name] = c._id;
  });

  const items = menuItems.map((item) => {
    let catId = createdCats[0]._id;
    if (["كفتة مشوية", "شيش طاووق", "ريش ضاني", "Mixed Grill"].includes(item.name)) catId = catMap["مشويات"];
    else if (["فول بالزيت الحار", "طعمية", "بيض بالبسطرمة"].includes(item.name)) catId = catMap["فطور"];
    else if (["شاورما فراخ", "برجر لحم", "كرسبي تشيكن"].includes(item.name)) catId = catMap["ساندوتشات"];
    else if (["شاي", "قهوة تركي", "نسكافيه", "هوت شوكليت"].includes(item.name)) catId = catMap["مشروبات ساخنة"];
    else if (["عصير فراولة", "ليمون نعناع", "موهيتو", "مياه معدنية"].includes(item.name)) catId = catMap["مشروبات باردة"];
    else if (["أم علي", "بسبوسة"].includes(item.name)) catId = catMap["حلويات"];

    return {
      ...item,
      category: catId,
      available: true,
      options: [],
    };
  });

  await Menu.insertMany(items);
  console.log(`✅ ${items.length} menu items created`);

  // 4. Default Settings
  const settings = await Settings.findOne({ key: "main" });
  if (!settings) {
    await Settings.create({
      key: "main",
      restaurantName: "GODZ Café & Restaurant",
      busyMode: false,
      busyEtaExtra: 10,
      onlinePaused: false,
    });
    console.log("✅ Main settings initialized");
  }

  // 5. Welcome Coupon
  const coupon = await Coupon.findOne({ code: "WELCOME10" });
  if (!coupon) {
    await Coupon.create({
      code: "WELCOME10",
      discountPercent: 10,
      minOrder: 50,
      isActive: true,
    });
    console.log("✅ Welcome coupon WELCOME10 created (10% off)");
  }

  console.log("\n🎉 Full Seed completed successfully!");
  console.log("-----------------------------------------");
  console.log("Admin Login:    ahmed   / ahmed123");
  console.log("Cashier Login:  cashier / cashier123");
  console.log("Kitchen Login:  kitchen / kitchen123");
  console.log("Bar Login:      bar     / bar123");
  console.log("-----------------------------------------");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

