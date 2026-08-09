# CodeAlpha - Simple E-commerce Store

A basic full-stack e-commerce website developed as part of the CodeAlpha internship.

## Features

- User registration and login
- Product listings
- Product details page
- Category-based products
- Recommended products
- Shopping cart
- Order processing
- Order management
- Django admin panel
- Database for products, users and orders

## Technologies

- HTML
- CSS
- JavaScript
- Python
- Django
- SQLite/Django Database

## Installation

1. Clone the repository:

   ```powershell
   git clone <repository-url>
   cd CodeAlpha_SimpleEcommerceStore
   ```

2. Create and activate a virtual environment:

   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

4. Run database migrations:

   ```powershell
   python manage.py migrate
   ```

5. Create a Django superuser (recommended for admin access):

   ```powershell
   python manage.py createsuperuser
   ```

6. Start the development server:

   ```powershell
   python manage.py runserver
   ```

7. Open the app in your browser:

   ```text
   http://127.0.0.1:8000/
   ```

## Accessing the Admin Panel

Django provides a built-in admin interface for managing products, categories, and orders.

1. Create an admin (superuser) account, if you haven't already:
   \`\`\`bash
   python manage.py createsuperuser
   \`\`\`
   Follow the prompts to set a username, email, and password.

2. Start the server:
   \`\`\`bash
   python manage.py runserver
   \`\`\`

3. Visit the admin login page:
   \`\`\`
   http://127.0.0.1:8000/admin/
   \`\`\`

4. Log in with the superuser credentials created in step 1.

From here you can:
- Add/edit/delete **Products** and **Categories**
- View and update **Order** status (pending → paid → shipped → delivered → cancelled)
- View **Users** and their **Carts**

**Note:** Regular users who register through the site's normal signup form do **not** have admin access — only accounts created via `createsuperuser`, or manually granted `is_staff` status through the admin panel, can log into `/admin/`.

## Notes

- Add products and categories through the Django admin panel or existing app interfaces.
- If you use a `.env` file, keep it out of version control.

## Project Structure

- `accounts/` — user authentication and account handling
- `store/` — product listings and category management
- `orders/` — shopping cart, checkout, and order processing
- `templates/` — HTML templates for the site
- `static/` — CSS and static assets

## GitHub Preparation

This repository is prepared for GitHub with a `.gitignore` file that excludes:

- `venv/`
- `.venv/`
- `env/`
- `__pycache__/`
- `*.pyc`
- `db.sqlite3`
- `.env`
- `.vscode/`
- `.idea/`
- sensitive credentials
