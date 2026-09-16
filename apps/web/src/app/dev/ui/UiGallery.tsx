'use client';

import { useState } from 'react';
import { Heart, Phone, Search, ShoppingCart } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmModal,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Modal,
  ProductCardSkeleton,
  QuantitySelector,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SimpleSelect,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DateRangePicker,
} from '@/components/ui';
import { SectionHeader } from '@/components/home/SectionHeader';
import type { DateRange } from 'react-day-picker';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card p-5">{children}</div>
    </section>
  );
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'По популярности' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Сначала дешёвые', description: 'от 50 000 сум' },
  { value: 'off', label: 'Недоступно', disabled: true },
];

export function UiGallery() {
  const [qty, setQty] = useState(1);
  const [sort, setSort] = useState('popular');
  const [confirm, setConfirm] = useState(false);
  const [modal, setModal] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  return (
    <div className="container mx-auto space-y-12 px-4 py-10">
      <SectionHeader
        eyebrow="/dev/ui"
        title="Компоненты RentEvent"
        description="Каждый примитив во всех состояниях. Токены, принципы и преамбула для промптов — в apps/web/DESIGN.md."
      />

      <Section title="Button" hint="Пилюли. primary светится; gradient — алиас primary; asChild для ссылок.">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button size="sm">Small</Button>
        <Button size="lg" leftIcon={<Phone />}>
          Large + icon
        </Button>
        <Button size="icon" aria-label="Корзина">
          <ShoppingCart />
        </Button>
        <Button isLoading>Loading</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Badge" hint="warning — сплошной amber-100/900, читается на фото.">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="success">Скидка</Badge>
        <Badge variant="warning">Осталось 1</Badge>
        <Badge variant="destructive">Нет в наличии</Badge>
        <Badge variant="graphite">3 000 000 сум/сутки</Badge>
        <Badge variant="outline" size="lg">
          Outline lg
        </Badge>
      </Section>

      <Section title="Input" hint="Метка, ошибка, подсказка, иконки.">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <Input label="Ваше имя" placeholder="Введите имя" />
          <Input label="Телефон" placeholder="+998" leftIcon={<Phone className="h-4 w-4" />} />
          <Input label="Поиск" placeholder="Поиск по каталогу" rightIcon={<Search className="h-4 w-4" />} helperText="Подсказка под полем" />
          <Input label="С ошибкой" defaultValue="abc" error="Заполните все поля" />
          <Input label="Disabled" disabled placeholder="Недоступно" />
        </div>
      </Section>

      <Section title="Select" hint="Radix Select; SimpleSelect принимает options.">
        <div className="w-full sm:w-72">
          <SimpleSelect label="Сортировка" value={sort} onChange={setSort} options={SORT_OPTIONS} />
        </div>
        <div className="w-full sm:w-72">
          <SimpleSelect label="С ошибкой" value="" onChange={() => {}} options={SORT_OPTIONS} placeholder="Выберите…" error="Обязательное поле" />
        </div>
      </Section>

      <Section title="Dialog · Modal · ConfirmModal · Sheet">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Выберите даты аренды</DialogTitle>
              <DialogDescription>Все товары сета попадут в корзину с этими датами.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Содержимое диалога.</p>
            <DialogFooter>
              <Button variant="ghost">Отмена</Button>
              <Button>Добавить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={() => setModal(true)}>
          Modal (controlled)
        </Button>
        <Modal isOpen={modal} onClose={() => setModal(false)} title="Адрес доставки" description="Куда привезти оборудование?">
          <Input label="Адрес" placeholder="Улица, дом" />
        </Modal>
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          ConfirmModal
        </Button>
        <ConfirmModal
          isOpen={confirm}
          onClose={() => setConfirm(false)}
          onConfirm={() => setConfirm(false)}
          title="Очистить корзину?"
          message="Все товары будут удалены из корзины. Это действие нельзя отменить."
          variant="destructive"
        />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
              <SheetDescription>Боковая панель на телефоне.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Section>

      <Section title="Tabs · Tooltip">
        <Tabs defaultValue="delivery" className="w-full sm:w-96">
          <TabsList>
            <TabsTrigger value="delivery">Доставка</TabsTrigger>
            <TabsTrigger value="pickup">Самовывоз</TabsTrigger>
          </TabsList>
          <TabsContent value="delivery" className="text-sm text-muted-foreground">
            Бесплатно при заказе от 500 000 сум.
          </TabsContent>
          <TabsContent value="pickup" className="text-sm text-muted-foreground">
            Toshkent, Usta Shirin koʻchasi, 254.
          </TabsContent>
        </Tabs>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" aria-label="В избранное">
              <Heart />
            </Button>
          </TooltipTrigger>
          <TooltipContent>В избранное</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Card · Skeleton · EmptyState · QuantitySelector · DateRangePicker">
        <Card hover className="w-full sm:w-64">
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>hover поднимает карточку</CardDescription>
          </CardHeader>
          <CardContent>
            <QuantitySelector value={qty} onChange={setQty} min={1} max={5} />
          </CardContent>
        </Card>
        <div className="w-full sm:w-64">
          <ProductCardSkeleton />
        </div>
        <div className="w-full space-y-2 sm:w-64">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="w-full sm:w-72">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        <div className="w-full">
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="Ничего не найдено"
            description="Попробуйте изменить параметры поиска"
            action={<Button>Сбросить фильтры</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
