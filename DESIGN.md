# DESIGN.md

## 1. How do login and the two roles work?

Customers register with name, email and password. The password is hashed with bcrypt before it is stored, and only the hash is saved (never returned by the API). On login the server returns a signed JWT token, and the frontend sends it in the `Authorization: Bearer` header on every request.

There are two roles: `customer` and `studio`. Registration always creates a customer, so nobody can sign up as studio. The studio account comes from the seed file. On every protected route, one middleware checks the token (no token or a bad token gives 401) and another checks the role (wrong role gives 403). Customers only ever query records that belong to them, so asking for someone else's order, booking or pottery request returns 404.

## 2. Which database did you choose, and why?

MongoDB Atlas. I already know MongoDB and Mongoose, it is cloud-hosted, and it supports atomic single-document updates and unique (partial) indexes, which are what I need to prevent double buying and double booking.

## 3. How do you stop two people from taking the same painting or date?

Painting: buying runs one atomic update, "set status to sold only where the painting is still available". If two customers click at once, only one update matches and the other gets a "already sold" message (409). As a second safety net, the orders collection has a unique index that allows only one `placed` order per painting. Cancelling an order sets the painting back to available.

Date: each booking has an `active` flag (true while it is requested or confirmed). A unique index on `date` for active bookings makes the database itself refuse a second booking for the same date, which the API turns into a 409 message. Declining or cancelling sets `active` to false, which frees the date.

## 4. What did you finish, what did you leave out, and what would you do next?

Finished (confirm each one after testing):
- Registration, login, hashed passwords, studio account from seed data, 401/403/404 checks
- Paintings: browse, studio add, studio edit only while available, buy, cancel, no double purchase
- Wall bookings: date window 7 to 90 days, size 10 to 500 sq ft, address, price = size x rate from the seed data, one booking per date, studio confirm/decline, customer cancel until 3 days before
- Pottery requests: item and glaze from the seed data, quantity 1 to 12, needed-by at least 14 days away, studio accept/decline, customer edit/cancel only while requested
- Loading, empty and error states on every screen that loads data

Left out: payments, password reset, image uploads, pagination, deployment, and automated frontend tests (I only have API check scripts).

Known limits: dates are checked against the server's local date, so a server in another time zone could be off by a day near midnight.

Next: automated tests for the frontend, pagination, and a calendar that greys out booked dates.
