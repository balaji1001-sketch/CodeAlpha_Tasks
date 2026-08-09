from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from store.models import Product, Category
from orders.models import Cart, CartItem, Order


class CartTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            name="Test Phone",
            description="A phone",
            price=10000,
            stock=5,
            category=self.category,
        )
        self.client.login(username="testuser", password="testpass123")

    def test_add_to_cart_creates_cart_item(self):
        self.client.get(
            reverse("product_detail", args=[self.product.id])
        )  # just touching a page
        response = self.client.get(reverse("add_to_cart", args=[self.product.id]))
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 1)

    def test_add_to_cart_twice_increments_quantity(self):
        self.client.get(reverse("add_to_cart", args=[self.product.id]))
        self.client.get(reverse("add_to_cart", args=[self.product.id]))
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.first().quantity, 2)

    def test_cannot_view_cart_when_logged_out(self):
        self.client.logout()
        response = self.client.get(reverse("view_cart"))
        self.assertEqual(response.status_code, 302)  # redirected to login


class CheckoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="buyer", password="testpass123")
        self.category = Category.objects.create(name="Books")
        self.product = Product.objects.create(
            name="Django Book",
            description="Learn Django",
            price=500,
            stock=3,
            category=self.category,
        )
        self.client.login(username="buyer", password="testpass123")
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)

    def test_checkout_creates_order_and_reduces_stock(self):
        self.client.post(reverse("checkout"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)  # 3 - 2 = 1
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)

    def test_checkout_clears_cart(self):
        self.client.post(reverse("checkout"))
        cart = Cart.objects.get(user=self.user)
        self.assertEqual(cart.items.count(), 0)

    def test_checkout_blocks_when_stock_insufficient(self):
        cart = Cart.objects.get(user=self.user)
        cart.items.update(quantity=10)  # more than the 3 in stock
        self.client.post(reverse("checkout"))
        self.assertEqual(
            Order.objects.filter(user=self.user).count(), 0
        )  # no order created
