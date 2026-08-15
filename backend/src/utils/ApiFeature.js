class ApiFeature {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const excludedFields = ["page", "sort", "limit", "fields", "keyword"];
    const queryObj = { ...this.queryString };
    excludedFields.forEach((field) => delete queryObj[field]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      this.mongooseQuery = this.mongooseQuery.sort(
        this.queryString.sort.split(",").join(" ")
      );
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  select() {
    if (this.queryString.fields) {
      this.mongooseQuery = this.mongooseQuery.select(
        this.queryString.fields.split(",").join(" ")
      );
    }
    return this;
  }

  search(searchableFields = []) {
    if (this.queryString.keyword && searchableFields.length) {
      const keywordRegex = { $regex: this.queryString.keyword, $options: "i" };
      this.mongooseQuery = this.mongooseQuery.find({
        $or: searchableFields.map((field) => ({ [field]: keywordRegex })),
      });
    }
    return this;
  }

  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 20;
    this.mongooseQuery = this.mongooseQuery
      .skip((page - 1) * limit)
      .limit(limit);
    this.paginationResult = { currentPage: page, limit };
    return this;
  }
}

export default ApiFeature;
