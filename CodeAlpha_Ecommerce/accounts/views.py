from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib import messages
from .forms import RegisterForm
from orders.models import Cart


def register(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            Cart.objects.create(user=user)  # every user gets a cart immediately
            login(request, user)
            messages.success(request, "Welcome! Your account has been created.")
            return redirect("product_list")
    else:
        form = RegisterForm()
    return render(request, "accounts/register.html", {"form": form})
