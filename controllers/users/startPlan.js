const { Planning, Book } = require('../../models');
const { DateTime } = require('luxon');
const { bookStatus } = require('../../helpers/constants');

const startPlan = async (req, res, next) => {
  try {
    const { startDate, endDate, books } = req.body;
    const { READ, DONE } = bookStatus;
    const user = req.user;

    console.log(books);

    const startTime = startDate.split('-');
    const endTime = endDate.split('-');
    const startDateObjArr = DateTime.local(Number(startTime[0]), Number(startTime[1]), Number(startTime[2]));
    const endDateObjArr = DateTime.local(Number(endTime[0]), Number(endTime[1]), Number(endTime[2]));
    const duration = endDateObjArr.diff(startDateObjArr, 'days').toObject().days;

    if (!duration || duration < 1) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'wrong dates, use YYYY-MM-DD format or select current date',
      });
    }

    const selectedBooks = [];
    let numberOfPages = 0;

    for (let i = 0; i < books.length; i++) {
      const book = await Book.findOne({ _id: books[i] });
      console.log(book);
      if (!book || !user?.books.includes(book?._id)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'wrong book id',
        });
      }

      if (book.readPages !== 0) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: "you can't add book that you've already read",
        });
      }

      numberOfPages += book.totalPages;
      book.status = READ;
      const { _id, title, author, year, status, totalPages, readPages, review, rating } = book;

      const validateBook = {
        _id,
        title,
        author,
        year,
        status,
        totalPages,
        readPages,
        review,
        rating,
      };

      console.log(validateBook);
      selectedBooks.push(validateBook);
    }

    const pagesPerDay = Math.ceil(numberOfPages / duration);

    const training = await Planning.findOne({ _id: user?.planning });

    if (training) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'you already have active planning',
      });
    }

    const createTraining = await Planning.create({
      startDate,
      endDate,
      duration,
      books,
      status: 'read',
      pagesPerDay,
      booksToRead: selectedBooks,
      totalPages: numberOfPages,
    });

    if (selectedBooks.status === DONE) {
      return res.status(200).json({
        status: 'success',
        code: 200,
        message: 'The training is over - well done',
      });
    }

    //  '633f25d51a4db877138d3b65', '633f26651a4db877138d3b6f', '633f266a389366a932090682', '633f26ed2fe2c39a45ce8d05';

    user.planning = createTraining._id;
    user.planning.push(createTraining);

    await user.save();
    await createTraining.save();

    return res.status(201).json({
      status: 'success',
      code: 201,
      data: {
        _id: createTraining._id,
        startDate: createTraining.startDate,
        endDate: createTraining.endDate,
        duration: createTraining.duration,
        status: 'read',
        booksToRead: selectedBooks,
        pagesPerDay: createTraining.pagesPerDay,
        totalPages: createTraining.totalPages,
        readPages: createTraining.readPages,
        results: createTraining.results,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = startPlan;
