import "dotenv/config";
import mongoose from "mongoose";
import Category from "./database/models/category.model.js";
import Menu from "./database/models/menu.model.js";

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

  // فطور
  { name: "فول بالزيت الحار", nameAr: "فول بالزيت الحار", nameEn: "Foul", station: "kitchen", price: 25, descAr: "فول مدمس مع زيت حار وطحينة", sort: 5 },
  { name: "طعمية", nameAr: "طعمية", nameEn: "Taameya", station: "kitchen", price: 20, descAr: "5 قطع طعمية مقرمشة", sort: 6 },
  { name: "بيض بالبسطرمة", nameAr: "بيض بالبسطرمة", nameEn: "Eggs with Basturma", station: "kitchen", price: 45, descAr: "بيض مقلي مع بسطرمة", sort: 7 },

  // ساندوتشات
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

  // حلويات
  { name: "أم علي", nameAr: "أم علي", nameEn: "Om Ali", station: "kitchen", price: 45, descAr: "أم علي بالمكسرات", sort: 19 },
  { name: "بسبوسة", nameAr: "بسبوسة", nameEn: "Basbousa", station: "kitchen", price: 30, descAr: "قطعة بسبوسة بالقشطة", sort: 20 },
];

async function seed() {
  await mongoose.connect(MONGO);
  console.log("Connected to MongoDB");

  // امسح القديم
  await Category.deleteMany({});
  await Menu.deleteMany({});

  const createdCats = await Category.insertMany(categories);
  console.log(`✅ ${createdCats.length} categories`);

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
  console.log(`✅ ${items.length} menu items`);

  console.log("\n🎉 Seed completed! Egyptian menu is ready.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
