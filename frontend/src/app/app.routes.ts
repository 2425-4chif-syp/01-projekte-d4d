import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { OfferServicesComponent } from './features/offer-services/offer-services.component';
import { RequestServicesComponent } from './features/request-services/request-services.component';
import { ChatsComponent } from './features/chats/chats.component';
import { UserMatchesComponent } from './features/user-matches/user-matches.component';
import { InboxComponent } from './features/inbox/inbox.component';
import { MarketplaceComponent } from './features/marketplace/marketplace.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { MyServicesComponent } from './features/my-services/my-services.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'offer-services', component: OfferServicesComponent },
  { path: 'request-services', component: RequestServicesComponent },
  { path: 'marketplace', component: MarketplaceComponent },
  { path: 'user-matches', component: UserMatchesComponent },
  {
    path: 'chats',
    component: ChatsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'inbox',
    component: InboxComponent,
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    component: CalendarComponent,
    canActivate: [authGuard],
  },
  {
    path: 'my-services',
    component: MyServicesComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
